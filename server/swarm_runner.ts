import { swarmPubSub } from '../lib/pubsub';
import { dbStore } from '../lib/firestore';
import { runCoordinatorDecomposer } from '../coordinator/decomposer';
import { checkAndRunReplanning } from '../coordinator/replanner';
import { processWorkerTask } from '../worker/worker';
import { runSynthesizer } from '../synthesizer/generator';
import { TaskPubSubMessage } from '../lib/types';

export function initializeSwarmOrchestrator() {
  console.log('[Swarm Orchestrator] Initializing multi-agent event dispatch bus listeners...');

  // Worker task listener
  swarmPubSub.onTask(async (msg: TaskPubSubMessage) => {
    await processWorkerTask(msg);
  });

  // Listen to worker completion events to trigger Re-planner and Synthesizer
  dbStore.on('worker_done', async (finding) => {
    const jobId = finding.jobId;
    console.log(`[Swarm Orchestrator] Handling worker_done event for Job [${jobId}]...`);

    // 1. Check if Re-planner should spawn new sub-questions
    const replanned = await checkAndRunReplanning(jobId);

    // 2. Trigger Synthesizer to re-compile living report
    await runSynthesizer(jobId);
  });

  console.log('[Swarm Orchestrator] Ready to accept research jobs.');
}

export async function launchNewJob(jobId: string): Promise<void> {
  // Asynchronously start coordinator decomposition without blocking HTTP response
  setTimeout(async () => {
    try {
      await runCoordinatorDecomposer(jobId);
    } catch (err) {
      console.error(`[Swarm Orchestrator] Error running coordinator for Job [${jobId}]:`, err);
      await dbStore.updateJob(jobId, { status: 'failed' });
      await dbStore.addActivityLog(jobId, 'SYSTEM', `Fatal coordinator error: ${(err as Error).message}`);
    }
  }, 100);
}
