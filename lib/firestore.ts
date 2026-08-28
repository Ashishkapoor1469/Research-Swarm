import { Firestore, FieldValue } from '@google-cloud/firestore';
import { ResearchJob, ResearchTask, WorkerFinding, LivingReport, JobStatus, TaskStatus, Workspace } from './types';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

class DBStore extends EventEmitter {
  private db: Firestore | null = null;
  private memoryWorkspaces: Map<string, Workspace> = new Map();
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

  // --- Workspaces ---

  async createWorkspace(ownerId: string, name: string, description?: string, color?: string): Promise<Workspace> {
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: `ws-${uuidv4().slice(0, 8)}`,
      ownerId: ownerId || 'user-default',
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#d97745',
      fileCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.memoryWorkspaces.set(workspace.id, workspace);

    if (this.db) {
      try {
        await this.db.collection('workspaces').doc(workspace.id).set(workspace);
      } catch (e) {
        console.error('[Firestore] Error creating workspace doc:', e);
      }
    }

    this.emit('workspace_created', workspace);
    return workspace;
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    if (this.db) {
      try {
        const doc = await this.db.collection('workspaces').doc(id).get();
        if (doc.exists) return doc.data() as Workspace;
      } catch (e) {
        // fallback to memory
      }
    }
    return this.memoryWorkspaces.get(id) || null;
  }

  async listWorkspaces(ownerId: string = 'user-default'): Promise<Workspace[]> {
    let list: Workspace[] = [];

    if (this.db) {
      try {
        const snap = await this.db.collection('workspaces')
          .where('ownerId', '==', ownerId)
          .get();
        if (!snap.empty) {
          list = snap.docs.map(doc => doc.data() as Workspace);
        }
      } catch (e) {
        // fallback
      }
    }

    if (list.length === 0) {
      list = Array.from(this.memoryWorkspaces.values()).filter(ws => ws.ownerId === ownerId || ownerId === 'user-default');
    }

    // Sort by updatedAt desc
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async renameWorkspace(id: string, name: string, description?: string, color?: string): Promise<Workspace | null> {
    const ws = await this.getWorkspace(id);
    if (!ws) return null;

    ws.name = name.trim();
    if (description !== undefined) ws.description = description.trim();
    if (color !== undefined) ws.color = color;
    ws.updatedAt = new Date().toISOString();

    this.memoryWorkspaces.set(id, ws);

    if (this.db) {
      try {
        await this.db.collection('workspaces').doc(id).update({
          name: ws.name,
          description: ws.description,
          ...(color ? { color } : {}),
          updatedAt: ws.updatedAt
        });
      } catch (e) {
        console.error('[Firestore] Error updating workspace:', e);
      }
    }

    this.emit(`workspace:${id}`, ws);
    return ws;
  }

  async deleteWorkspace(id: string, confirm: boolean): Promise<boolean> {
    if (!confirm) {
      throw new Error("Explicit confirmation (?confirm=true) is required to delete a workspace.");
    }

    const ws = await this.getWorkspace(id);
    if (!ws) return false;

    // Cascade-delete all jobs belonging to this workspace
    const jobs = await this.listJobsInWorkspace(id);
    for (const job of jobs) {
      await this.deleteJobInternal(job.id);
    }

    this.memoryWorkspaces.delete(id);

    if (this.db) {
      try {
        await this.db.collection('workspaces').doc(id).delete();
      } catch (e) {
        console.error('[Firestore] Error deleting workspace:', e);
      }
    }

    this.emit('workspace_deleted', id);
    return true;
  }

  async updateWorkspaceFileCount(workspaceId: string, delta: number): Promise<void> {
    const ws = await this.getWorkspace(workspaceId);
    if (!ws) return;

    ws.fileCount = Math.max(0, (ws.fileCount || 0) + delta);
    ws.updatedAt = new Date().toISOString();

    this.memoryWorkspaces.set(workspaceId, ws);

    if (this.db) {
      try {
        await this.db.collection('workspaces').doc(workspaceId).update({
          fileCount: FieldValue.increment(delta),
          updatedAt: ws.updatedAt
        });
      } catch (e) {
        console.error('[Firestore] Error updating fileCount:', e);
      }
    }
  }

  // --- Jobs ---

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

    // Atomically increment parent workspace fileCount
    if (job.workspaceId) {
      await this.updateWorkspaceFileCount(job.workspaceId, 1);
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

  async listJobsInWorkspace(workspaceId: string): Promise<ResearchJob[]> {
    let list: ResearchJob[] = [];

    if (this.db) {
      try {
        const snap = await this.db.collection('jobs')
          .where('workspaceId', '==', workspaceId)
          .get();
        if (!snap.empty) {
          list = snap.docs.map(doc => doc.data() as ResearchJob);
        }
      } catch (e) {
        // fallback
      }
    }

    if (list.length === 0) {
      list = Array.from(this.memoryJobs.values()).filter(j => j.workspaceId === workspaceId);
    }

    // Sort by createdAt desc
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  async deleteJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;

    const result = await this.deleteJobInternal(jobId);

    // Decrement parent workspace fileCount
    if (job.workspaceId) {
      await this.updateWorkspaceFileCount(job.workspaceId, -1);
    }

    return result;
  }

  private async deleteJobInternal(jobId: string): Promise<boolean> {
    this.memoryJobs.delete(jobId);
    this.memoryTasks.delete(jobId);
    this.memoryFindings.delete(jobId);

    if (this.db) {
      try {
        await this.db.collection('jobs').doc(jobId).delete();
      } catch (e) {
        console.error('[Firestore] Error deleting job doc:', e);
      }
    }

    this.emit('job_deleted', jobId);
    return true;
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

  // --- Tasks ---

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

  // --- Worker Findings ---

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

  // --- Living Report ---

  async updateLivingReport(jobId: string, report: LivingReport): Promise<void> {
    await this.updateJob(jobId, { livingReport: report });
  }
}

export const dbStore = new DBStore();
