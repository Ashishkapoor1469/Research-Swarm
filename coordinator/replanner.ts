import { dbStore } from '../lib/firestore';
import { swarmPubSub } from '../lib/pubsub';
import { GeminiService } from '../lib/gemini';
import { ResearchTask } from '../lib/types';

/**
 * Evaluates intermediate worker findings to determine if follow-up research is required.
 * Acts as the Coordinator's adaptive re-planner. Enforces backpressure limits
 * (maxTasks and maxDurationMinutes) to prevent unbounded execution loops.
 * 
 * @param jobId The unique ID of the target ResearchJob
 * @returns True if new follow-up tasks were spawned; false otherwise
 */
export async function checkAndRunReplanning(jobId: string): Promise<boolean> {
  const job = await dbStore.getJob(jobId);
  if (!job || job.status === 'completed' || job.status === 'synthesizing' || job.status === 'budget-exhausted-synthesizing') {
    return false;
  }

  const maxTasks = job.maxTasks || 20;
  const maxDurationMinutes = job.maxDurationMinutes || 90;
  const elapsedMinutes = (Date.now() - new Date(job.createdAt).getTime()) / 60000;

  // Backpressure & Cost/Runtime Bound Enforcement
  if (job.tasksTotal >= maxTasks || elapsedMinutes >= maxDurationMinutes) {
    console.log(`[Coordinator Re-planner] [Backpressure] Limit reached for Job [${jobId}]: ${job.tasksTotal}/${maxTasks} tasks used, ${elapsedMinutes.toFixed(1)}/${maxDurationMinutes}m elapsed.`);
    await dbStore.updateJob(jobId, { status: 'budget-exhausted-synthesizing' });
    await dbStore.addActivityLog(
      jobId,
      'COORDINATOR',
      `⚠️ Swarm backpressure limit reached (${job.tasksTotal}/${maxTasks} tasks limit). Halting follow-up task creation and proceeding to final synthesis.`,
      { tasksTotal: job.tasksTotal, maxTasks, elapsedMinutes }
    );
    return false;
  }

  // Only run re-planner at specific milestones (e.g. at 50% completed tasks, and maximum 1 re-plan cycle)
  if (job.replanningCount >= 1) {
    return false;
  }

  const tasks = await dbStore.getTasks(jobId);
  const doneTasks = tasks.filter(t => t.status === 'done');
  
  if (doneTasks.length < 2 || doneTasks.length < Math.floor(tasks.length / 2)) {
    return false;
  }

  console.log(`[Coordinator Re-planner] Evaluating intermediate findings for Job [${jobId}]...`);
  await dbStore.addActivityLog(jobId, 'COORDINATOR', 'Evaluating intermediate findings to check if dynamic follow-up research is required...');

  const findings = await dbStore.getFindings(jobId);
  const evaluation = await GeminiService.evaluateReplanning(job.question, findings);

  if (evaluation.needMoreTasks && evaluation.newSubquestions.length > 0) {
    console.log(`[Coordinator Re-planner] Discovered ${evaluation.newSubquestions.length} new research angles! Spawning follow-up tasks.`);
    await dbStore.addActivityLog(
      jobId, 
      'COORDINATOR', 
      `⚡ Re-planning triggered! Discovered unexpected research angle. Dynamically spawning ${evaluation.newSubquestions.length} follow-up sub-question(s).`,
      { newSubquestions: evaluation.newSubquestions }
    );

    const updatedTasksTotal = job.tasksTotal + evaluation.newSubquestions.length;
    await dbStore.updateJob(jobId, {
      tasksTotal: updatedTasksTotal,
      replanningCount: job.replanningCount + 1
    });

    for (let i = 0; i < evaluation.newSubquestions.length; i++) {
      const sq = evaluation.newSubquestions[i];
      const taskId = `task-${jobId.slice(0, 8)}-followup-${i + 1}`;
      
      const task: ResearchTask = {
        id: taskId,
        jobId,
        subquestion: sq.subquestion,
        searchHint: sq.searchHint,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbStore.addTask(task);
      await swarmPubSub.publishTask({
        jobId,
        taskId: task.id,
        subquestion: task.subquestion,
        searchHint: task.searchHint,
        attempt: 1
      });
    }

    return true;
  }

  return false;
}
