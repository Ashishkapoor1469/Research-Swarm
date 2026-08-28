import { dbStore } from '../lib/firestore';
import { swarmPubSub } from '../lib/pubsub';
import { GeminiService } from '../lib/gemini';
import { ResearchTask } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Decomposes a broad research prompt into parallel sub-questions.
 * Invoked asynchronously by the Coordinator Agent upon job creation.
 * Writes tasks to Firestore and dispatches task messages to Pub/Sub.
 * 
 * @param jobId The unique ID of the target ResearchJob
 */
export async function runCoordinatorDecomposer(jobId: string): Promise<void> {
  const traceId = jobId;
  console.log(`[Coordinator] [traceId=${traceId}] Starting decomposition for Job [${jobId}]...`);
  await dbStore.addActivityLog(jobId, 'COORDINATOR', 'Decomposing main research prompt into parallel sub-questions...', { traceId });

  const job = await dbStore.getJob(jobId);
  if (!job) {
    console.error(`[Coordinator] Job [${jobId}] not found.`);
    return;
  }

  // Gemini model call to decompose
  const decomposition = await GeminiService.decomposeQuestion(job.question, job.depth);
  const subquestions = decomposition.subquestions;

  console.log(`[Coordinator] Decomposed question into ${subquestions.length} sub-questions.`);
  await dbStore.addActivityLog(jobId, 'COORDINATOR', `Generated ${subquestions.length} sub-questions with web search hints. Launching worker swarm...`, { subquestions });

  const tasks: ResearchTask[] = [];

  for (let i = 0; i < subquestions.length; i++) {
    const sq = subquestions[i];
    const taskId = `task-${jobId.slice(0, 8)}-${i + 1}`;
    
    const task: ResearchTask = {
      id: taskId,
      jobId: jobId,
      subquestion: sq.subquestion,
      searchHint: sq.searchHint,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbStore.addTask(task);
    tasks.push(task);

    // Publish to Pub/Sub
    await swarmPubSub.publishTask({
      jobId,
      taskId: task.id,
      subquestion: task.subquestion,
      searchHint: task.searchHint,
      attempt: 1
    });
  }

  // Update job status to in_progress
  await dbStore.updateJob(jobId, {
    status: 'in_progress',
    tasksTotal: tasks.length,
    tasksCompleted: 0
  });

  console.log(`[Coordinator] Decomposition complete. ${tasks.length} tasks published to Pub/Sub bus.`);
}
