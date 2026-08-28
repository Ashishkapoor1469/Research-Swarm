import { Firestore } from '@google-cloud/firestore';
import { ResearchJob, ResearchTask, WorkerFinding, LivingReport, JobStatus, TaskStatus } from './types';
import { EventEmitter } from 'events';

class DBStore extends EventEmitter {
  private db: Firestore | null = null;
  private memoryJobs: Map<string, ResearchJob> = new Map();
  private memoryTasks: Map<string, ResearchTask[]> = new Map();
  private memoryFindings: Map<string, WorkerFinding[]> = new Map();

  constructor() {
    super();
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIRESTORE_EMULATOR_HOST) {
        this.db = new Firestore();
        console.log('[FirestoreDB] Initialized with Google Cloud Firestore SDK');
      } else {
        console.log('[FirestoreDB] No GCP credentials detected. Operating in high-speed In-Memory DB mode with event streaming.');
      }
    } catch (err) {
      console.warn('[FirestoreDB] Initializing fallback in-memory store:', (err as Error).message);
    }
  }

  // Jobs
  async createJob(job: ResearchJob): Promise<void> {
    this.memoryJobs.set(job.id, job);
    if (!this.memoryTasks.has(job.id)) this.memoryTasks.set(job.id, []);
    if (!this.memoryFindings.has(job.id)) this.memoryFindings.set(job.id, []);

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(job.id).set(job);
      } catch (e) {
        console.error('[Firestore] Error creating job doc:', e);
      }
    }
    this.emit(`job:${job.id}`, job);
    this.emit('job_updated', job);
  }

  async getJob(jobId: string): Promise<ResearchJob | null> {
    if (this.db) {
      try {
        const doc = await this.db.collection('jobs').doc(jobId).get();
        if (doc.exists) return doc.data() as ResearchJob;
      } catch (e) {
        // fallback to memory
      }
    }
    return this.memoryJobs.get(jobId) || null;
  }

  async updateJob(jobId: string, updates: Partial<ResearchJob>): Promise<ResearchJob | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const updatedJob: ResearchJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.memoryJobs.set(jobId, updatedJob);

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(jobId).update({
          ...updates,
          updatedAt: updatedJob.updatedAt
        });
      } catch (e) {
        console.error('[Firestore] Error updating job doc:', e);
      }
    }

    this.emit(`job:${jobId}`, updatedJob);
    this.emit('job_updated', updatedJob);
    return updatedJob;
  }

  async addActivityLog(jobId: string, agent: ResearchJob['activityLog'][0]['agent'], message: string, metadata?: Record<string, any>): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const newLog = {
      timestamp: new Date().toISOString(),
      agent,
      message,
      metadata
    };

    const updatedLogs = [...(job.activityLog || []), newLog];
    await this.updateJob(jobId, { activityLog: updatedLogs });
  }

  // Tasks
  async addTask(task: ResearchTask): Promise<void> {
    const tasks = this.memoryTasks.get(task.jobId) || [];
    tasks.push(task);
    this.memoryTasks.set(task.jobId, tasks);

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(task.jobId).collection('tasks').doc(task.id).set(task);
      } catch (e) {
        console.error('[Firestore] Error adding task doc:', e);
      }
    }
    this.emit(`tasks:${task.jobId}`, tasks);
  }

  async getTasks(jobId: string): Promise<ResearchTask[]> {
    if (this.db) {
      try {
        const snap = await this.db.collection('jobs').doc(jobId).collection('tasks').get();
        if (!snap.empty) {
          return snap.docs.map(doc => doc.data() as ResearchTask);
        }
      } catch (e) {
        // fallback
      }
    }
    return this.memoryTasks.get(jobId) || [];
  }

  async updateTaskStatus(
    jobId: string, 
    taskId: string, 
    status: TaskStatus, 
    error?: string, 
    timing?: { startedAt?: string; completedAt?: string; durationMs?: number }
  ): Promise<ResearchTask | null> {
    const tasks = await this.getTasks(jobId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (timing?.startedAt) task.startedAt = timing.startedAt;
    if (timing?.completedAt) task.completedAt = timing.completedAt;
    if (timing?.durationMs) task.durationMs = timing.durationMs;
    if (error) task.error = error;

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(jobId).collection('tasks').doc(taskId).update({
          status,
          updatedAt: task.updatedAt,
          ...(timing?.startedAt ? { startedAt: timing.startedAt } : {}),
          ...(timing?.completedAt ? { completedAt: timing.completedAt } : {}),
          ...(timing?.durationMs ? { durationMs: timing.durationMs } : {}),
          ...(error ? { error } : {})
        });
      } catch (e) {
        console.error('[Firestore] Error updating task doc:', e);
      }
    }

    this.emit(`tasks:${jobId}`, tasks);
    return task;
  }

  // Worker Findings
  async addFinding(finding: WorkerFinding): Promise<void> {
    const findings = this.memoryFindings.get(finding.jobId) || [];
    findings.push(finding);
    this.memoryFindings.set(finding.jobId, findings);

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(finding.jobId).collection('findings').doc(finding.id).set(finding);
      } catch (e) {
        console.error('[Firestore] Error adding finding doc:', e);
      }
    }
    this.emit(`findings:${finding.jobId}`, findings);
    this.emit('worker_done', finding);
  }

  async getFindings(jobId: string): Promise<WorkerFinding[]> {
    if (this.db) {
      try {
        const snap = await this.db.collection('jobs').doc(jobId).collection('findings').get();
        if (!snap.empty) {
          return snap.docs.map(doc => doc.data() as WorkerFinding);
        }
      } catch (e) {
        // fallback
      }
    }
    return this.memoryFindings.get(jobId) || [];
  }

  // Living Report
  async updateLivingReport(jobId: string, report: LivingReport): Promise<void> {
    await this.updateJob(jobId, { livingReport: report });
  }
}

export const dbStore = new DBStore();
