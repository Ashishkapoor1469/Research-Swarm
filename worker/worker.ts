import { dbStore } from '../lib/firestore';
import { TaskPubSubMessage, WorkerFinding } from '../lib/types';
import { performWorkerResearch } from './search_tool';
import { retryWithExponentialBackoff } from './retry';
import { v4 as uuidv4 } from 'uuid';

export async function processWorkerTask(msg: TaskPubSubMessage): Promise<void> {
  const { jobId, taskId, subquestion, searchHint } = msg;
  const traceId = jobId; // Observability: traceId equals jobId across log lines
  const workerId = `worker-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();
  const startedAtIso = new Date(startTime).toISOString();

  /**
   * Distributed Systems Idempotency Check:
   * Google Cloud Pub/Sub guarantees at-least-once message delivery semantics.
   * If a message is redelivered due to network re-try or subscriber timeout,
   * we verify whether this task has already been processed and stored in Firestore.
   */
  const existingFindings = await dbStore.getFindings(jobId);
  const existingFinding = existingFindings.find(f => f.taskId === taskId);
  const existingTasks = await dbStore.getTasks(jobId);
  const currentTask = existingTasks.find(t => t.id === taskId);

  if (existingFinding || currentTask?.status === 'done') {
    console.log(`[Worker Swarm] [traceId=${traceId}] [Idempotency] Duplicate delivery skipped for Task [${taskId}]`);
    await dbStore.addActivityLog(jobId, 'WORKER', `ℹ️ Duplicate delivery skipped: Task [${taskId}] is already completed.`, {
      traceId,
      taskId,
      workerId,
      status: 'duplicate_skipped'
    });
    return;
  }

  console.log(`[Worker Swarm] [traceId=${traceId}] Worker [${workerId}] picked up Task [${taskId}]`);
  
  await dbStore.updateTaskStatus(jobId, taskId, 'running', undefined, { startedAt: startedAtIso });
  await dbStore.addActivityLog(jobId, 'WORKER', `Worker [${workerId}] active: Searching & reading web sources for "${subquestion.slice(0, 60)}..."`, {
    traceId,
    taskId,
    workerId,
    subquestion
  });

  try {
    const researchResult = await retryWithExponentialBackoff(
      async () => {
        // Occasionally simulate a transient web timeout in 5% of runs to demonstrate retry resiliency!
        if (process.env.DEMO_SIMULATE_RETRY === 'true' && Math.random() < 0.1) {
          throw new Error("HTTP 503 Gateway Timeout fetching source web page");
        }
        return await performWorkerResearch(subquestion, searchHint);
      },
      3,
      1200,
      async (attempt, err) => {
        await dbStore.addActivityLog(jobId, 'WORKER', `⚠️ Worker [${workerId}] attempt ${attempt} warning: ${err.message}. Retrying with exponential backoff...`, {
          traceId,
          taskId,
          attempt
        });
      }
    );

    const endTime = Date.now();
    const completedAtIso = new Date(endTime).toISOString();
    const durationMs = endTime - startTime;

    const finding: WorkerFinding = {
      id: `finding-${uuidv4().slice(0, 8)}`,
      jobId,
      taskId,
      subquestion,
      summary: researchResult.summary,
      keyFacts: researchResult.keyFacts,
      sources: researchResult.sources,
      confidence: researchResult.confidence,
      createdAt: completedAtIso
    };

    // Save finding
    await dbStore.addFinding(finding);

    // Update task status with timing metrics
    await dbStore.updateTaskStatus(jobId, taskId, 'done', undefined, {
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      durationMs
    });

    // Increment completed tasks count on job doc
    const job = await dbStore.getJob(jobId);
    if (job) {
      const tasksCompleted = (job.tasksCompleted || 0) + 1;
      await dbStore.updateJob(jobId, { tasksCompleted });

      await dbStore.addActivityLog(jobId, 'WORKER', `✅ Worker [${workerId}] finished in ${durationMs}ms. Extracted ${finding.keyFacts.length} facts & ${finding.sources.length} sources.`, {
        traceId,
        taskId,
        workerId,
        durationMs,
        sourcesCount: finding.sources.length
      });
    }

  } catch (err) {
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const errorMessage = (err as Error).message;
    console.error(`[Worker Swarm] [traceId=${traceId}] Task [${taskId}] failed after retries:`, errorMessage);

    await dbStore.updateTaskStatus(jobId, taskId, 'failed', errorMessage, {
      startedAt: startedAtIso,
      completedAt: new Date().toISOString(),
      durationMs
    });
    await dbStore.addActivityLog(jobId, 'WORKER', `❌ Worker [${workerId}] task failed (${durationMs}ms): ${errorMessage}`, { traceId, taskId, error: errorMessage });
  }
}
