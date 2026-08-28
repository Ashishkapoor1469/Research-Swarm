import { PubSub } from '@google-cloud/pubsub';
import { TaskPubSubMessage } from './types';
import { EventEmitter } from 'events';

class SwarmPubSubBus extends EventEmitter {
  private pubsub: PubSub | null = null;
  private topicName = 'research-tasks';
  // Dedup set for subscriber-level idempotency protection
  private processedMessageIds: Set<string> = new Set();

  constructor() {
    super();
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.PUBSUB_EMULATOR_HOST) {
        this.pubsub = new PubSub();
        console.log('[PubSubBus] Initialized Google Cloud Pub/Sub SDK');
      } else {
        console.log('[PubSubBus] Operating in local memory async Pub/Sub event bus mode');
      }
    } catch (err) {
      console.warn('[PubSubBus] Initializing fallback in-memory PubSub bus:', (err as Error).message);
    }
  }

  async publishTask(taskMsg: TaskPubSubMessage): Promise<void> {
    console.log(`[PubSub] Publishing research task [${taskMsg.taskId}] for Job [${taskMsg.jobId}]: "${taskMsg.subquestion}"`);

    if (this.pubsub) {
      try {
        const topic = this.pubsub.topic(this.topicName);
        const dataBuffer = Buffer.from(JSON.stringify(taskMsg));
        await topic.publishMessage({ data: dataBuffer });
        return;
      } catch (err) {
        console.error('[PubSub] Cloud PubSub error, falling back to local bus:', err);
      }
    }

    // Local asynchronous event bus dispatch
    setTimeout(() => {
      this.emit('task_message', taskMsg);
    }, Math.floor(Math.random() * 800) + 200);
  }

  /**
   * Register subscriber callback for task messages.
   * Enforces subscriber-side deduplication against at-least-once message delivery.
   */
  onTask(handler: (msg: TaskPubSubMessage) => Promise<void>): void {
    this.on('task_message', async (taskMsg: TaskPubSubMessage) => {
      const msgKey = `${taskMsg.jobId}:${taskMsg.taskId}:${taskMsg.attempt}`;
      if (this.processedMessageIds.has(msgKey)) {
        console.log(`[PubSubBus] [Dedup] Skipping duplicate message key [${msgKey}]`);
        return;
      }
      this.processedMessageIds.add(msgKey);

      try {
        await handler(taskMsg);
      } catch (err) {
        console.error(`[PubSubBus] Worker error handling task ${taskMsg.taskId}:`, err);
      }
    });
  }
}

export const swarmPubSub = new SwarmPubSubBus();
