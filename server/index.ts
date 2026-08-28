import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../lib/firestore';
import { ResearchJob, JobDepth } from '../lib/types';
import { initializeSwarmOrchestrator, launchNewJob } from './swarm_runner';
import { GeminiService } from '../lib/gemini';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize background swarm orchestrator
initializeSwarmOrchestrator();

// ==================== WORKSPACES API ====================

// POST /workspaces - Create a new Workspace
app.post('/workspaces', async (req: Request, res: Response) => {
  try {
    const { name, description, color, ownerId = 'user-default' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const workspace = await dbStore.createWorkspace(ownerId, name, description, color);
    return res.status(201).json(workspace);
  } catch (err) {
    console.error('Error creating workspace:', err);
    return res.status(500).json({ error: 'Failed to create workspace.' });
  }
});

// GET /workspaces - List current user's workspaces
app.get('/workspaces', async (req: Request, res: Response) => {
  try {
    const ownerId = (req.query.ownerId as string) || 'user-default';
    const list = await dbStore.listWorkspaces(ownerId);
    return res.json(list);
  } catch (err) {
    console.error('Error listing workspaces:', err);
    return res.status(500).json({ error: 'Failed to list workspaces.' });
  }
});

// GET /workspaces/:id - Get workspace details
app.get('/workspaces/:id', async (req: Request, res: Response) => {
  try {
    const ws = await dbStore.getWorkspace(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
    return res.json(ws);
  } catch (err) {
    console.error('Error getting workspace:', err);
    return res.status(500).json({ error: 'Failed to retrieve workspace.' });
  }
});

// PATCH /workspaces/:id - Edit / rename workspace
app.patch('/workspaces/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name cannot be empty.' });
    }

    const updated = await dbStore.renameWorkspace(req.params.id, name, description, color);
    if (!updated) return res.status(404).json({ error: 'Workspace not found.' });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating workspace:', err);
    return res.status(500).json({ error: 'Failed to update workspace.' });
  }
});

// DELETE /workspaces/:id - Cascade-delete workspace (Requires ?confirm=true)
app.delete('/workspaces/:id', async (req: Request, res: Response) => {
  try {
    const isConfirmed = req.query.confirm === 'true' || req.body?.confirm === true;
    if (!isConfirmed) {
      return res.status(400).json({
        error: 'Explicit confirmation required to delete a workspace. Pass ?confirm=true in query or { confirm: true } in body.'
      });
    }

    const deleted = await dbStore.deleteWorkspace(req.params.id, true);
    if (!deleted) return res.status(404).json({ error: 'Workspace not found.' });
    return res.json({ message: `Workspace [${req.params.id}] and all associated research files deleted successfully.` });
  } catch (err) {
    console.error('Error deleting workspace:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /workspaces/:id/jobs - List research files (jobs) in workspace
app.get('/workspaces/:id/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await dbStore.listJobsInWorkspace(req.params.id);
    return res.json(jobs);
  } catch (err) {
    console.error('Error listing jobs in workspace:', err);
    return res.status(500).json({ error: 'Failed to list research files in workspace.' });
  }
});

// ==================== JOBS API ====================

// 1. POST /jobs - Job Intake Endpoint (Requires workspaceId)
app.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { question, depth = 'standard', workspaceId, fileName, model } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Valid research question is required (at least 5 characters).' });
    }

    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      return res.status(400).json({ error: 'workspaceId is required. Every research file belongs to an explicit workspace.' });
    }

    // Verify workspace exists
    const ws = await dbStore.getWorkspace(workspaceId);
    if (!ws) {
      return res.status(404).json({ error: `Workspace [${workspaceId}] not found.` });
    }

    const validDepth: JobDepth = ['quick', 'standard', 'deep'].includes(depth) ? depth : 'standard';
    const jobId = `job-${uuidv4()}`;

    const newJob: ResearchJob = {
      id: jobId,
      workspaceId: workspaceId.trim(),
      fileName: fileName?.trim() || question.trim(),
      question: question.trim(),
      depth: validDepth,
      model: model || 'gemini-2.5-flash',
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasksTotal: 0,
      tasksCompleted: 0,
      maxTasks: req.body.maxTasks || (validDepth === 'quick' ? 8 : validDepth === 'deep' ? 25 : 20),
      maxDurationMinutes: req.body.maxDurationMinutes || 90,
      replanningCount: 0,
      activityLog: [
        {
          timestamp: new Date().toISOString(),
          agent: 'SYSTEM',
          message: `Job created in Workspace "${ws.name}". Depth: "${validDepth}". Invoking Coordinator Agent...`
        }
      ]
    };

    // Store in DB
    await dbStore.createJob(newJob);

    // Asynchronously launch swarm (non-blocking for HTTP response)
    launchNewJob(jobId);

    // Immediate return (the "walk away" moment)
    return res.status(202).json({
      job_id: jobId,
      status: 'planning',
      message: 'Research Swarm dispatched. Job progress is running asynchronously in the background.',
      job_url: `/jobs/${jobId}`
    });

  } catch (err) {
    console.error('Error creating job:', err);
    return res.status(500).json({ error: 'Failed to create research job.' });
  }
});

// GET /jobs - List all jobs
app.get('/jobs', async (req: Request, res: Response) => {
  try {
    const ownerId = (req.query.ownerId as string) || 'user-default';
    const workspaces = await dbStore.listWorkspaces(ownerId);
    const allJobs: ResearchJob[] = [];

    for (const ws of workspaces) {
      const jobs = await dbStore.listJobsInWorkspace(ws.id);
      allJobs.push(...jobs);
    }

    return res.json(allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (err) {
    console.error('Error listing all jobs:', err);
    return res.status(500).json({ error: 'Failed to list jobs.' });
  }
});

// GET /jobs/:id - Query Job State
app.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = await dbStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const tasks = await dbStore.getTasks(jobId);
    const findings = await dbStore.getFindings(jobId);

    return res.json({
      job,
      tasks,
      findings
    });
  } catch (err) {
    console.error('Error retrieving job:', err);
    return res.status(500).json({ error: 'Failed to retrieve job state.' });
  }
});

// DELETE /jobs/:id - Delete single research job
app.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const deleted = await dbStore.deleteJob(jobId);
    if (!deleted) return res.status(404).json({ error: 'Job not found.' });
    return res.json({ message: `Job [${jobId}] deleted successfully.` });
  } catch (err) {
    console.error('Error deleting job:', err);
    return res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// POST /jobs/:id/followup - Wire Follow-Up Chat Input to Swarm Re-planner
app.post('/jobs/:id/followup', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Follow-up message is required.' });
    }

    const job = await dbStore.getJob(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    const findings = await dbStore.getFindings(jobId);
    const existingTasks = await dbStore.getTasks(jobId);

    // 1. Log USER follow-up request to activity feed
    await dbStore.addActivityLog(jobId, 'SYSTEM', `💬 User requested follow-up: "${message.trim()}"`, {
      agent: 'USER',
      message: message.trim()
    });

    // 2. Evaluate intent with Coordinator Agent
    const evalResult = await GeminiService.evaluateFollowupPrompt(job.question, message.trim(), findings);

    if (evalResult.intent === 'direct_answer' || !evalResult.subquestions || evalResult.subquestions.length === 0) {
      // Coordinator answers directly without new tasks
      await dbStore.addActivityLog(
        jobId,
        'COORDINATOR',
        `💡 Coordinator Answer: ${evalResult.answerText || 'Existing research findings already address your request.'}`
      );
      return res.json({ message: 'Coordinator answered directly.', intent: 'direct_answer' });
    }

    // 3. Budget Guard Check
    const currentTaskCount = existingTasks.length;
    const allowedNewTasks = Math.min(evalResult.subquestions.length, Math.max(0, (job.maxTasks || 20) - currentTaskCount));

    if (allowedNewTasks <= 0) {
      await dbStore.addActivityLog(
        jobId,
        'COORDINATOR',
        `⚠️ Task budget limit reached (${job.maxTasks || 20} max tasks). Unable to spawn additional follow-up tasks.`
      );
      return res.json({ message: 'Task budget limit reached.', intent: 'budget_exceeded' });
    }

    // 4. Spawn follow-up tasks
    const newSubqs = evalResult.subquestions.slice(0, allowedNewTasks);
    await dbStore.addActivityLog(
      jobId,
      'COORDINATOR',
      `🎯 Coordinator re-planner spawned ${newSubqs.length} follow-up sub-questions based on your request: "${message.trim()}"`
    );

    // Update job status back to in_progress
    await dbStore.updateJob(jobId, {
      status: 'in_progress',
      tasksTotal: currentTaskCount + newSubqs.length,
      replanningCount: (job.replanningCount || 0) + 1
    });

    // Publish new tasks to Pub/Sub
    const taskPubSubBus = require('./swarm_runner').taskPubSubBus;
    for (let i = 0; i < newSubqs.length; i++) {
      const subq = newSubqs[i];
      const taskId = `task-followup-${i + 1}-${uuidv4().slice(0, 8)}`;
      const newTask = {
        id: taskId,
        jobId,
        subquestion: subq.subquestion,
        searchHint: subq.searchHint,
        status: 'pending' as const,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbStore.addTask(newTask);
      await taskPubSubBus.publishTask({
        jobId,
        taskId,
        subquestion: subq.subquestion,
        searchHint: subq.searchHint,
        attempt: 1
      });
    }

    return res.json({ message: `Dispatched ${newSubqs.length} follow-up tasks.`, intent: 'spawn_tasks' });

  } catch (err) {
    console.error('Error processing follow-up request:', err);
    return res.status(500).json({ error: 'Failed to process follow-up request.' });
  }
});

// GET /jobs/:id/events - Realtime SSE Stream for Frontend Live Updates
app.get('/jobs/:id/events', async (req: Request, res: Response) => {
  const jobId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log(`[SSE] Client connected for real-time updates on Job [${jobId}]`);

  const sendUpdate = async () => {
    const job = await dbStore.getJob(jobId);
    if (job) {
      const tasks = await dbStore.getTasks(jobId);
      const findings = await dbStore.getFindings(jobId);
      res.write(`data: ${JSON.stringify({ job, tasks, findings })}\n\n`);
    }
  };

  await sendUpdate();

  const listener = async () => {
    await sendUpdate();
  };

  dbStore.on(`job:${jobId}`, listener);
  dbStore.on(`tasks:${jobId}`, listener);
  dbStore.on(`findings:${jobId}`, listener);

  req.on('close', () => {
    console.log(`[SSE] Client disconnected from Job [${jobId}]`);
    dbStore.off(`job:${jobId}`, listener);
    dbStore.off(`tasks:${jobId}`, listener);
    dbStore.off(`findings:${jobId}`, listener);
  });
});

// GET /jobs/:id/timeline - Per-task Observability & Parallel Execution Metrics
app.get('/jobs/:id/timeline', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = await dbStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const tasks = await dbStore.getTasks(jobId);
    
    const timelineData = tasks.map(task => ({
      id: task.id,
      subquestion: task.subquestion,
      status: task.status,
      workerId: task.workerId || 'unassigned',
      attempts: task.attempts,
      queuedAt: task.queuedAt || task.createdAt,
      startedAt: task.startedAt || null,
      completedAt: task.completedAt || null,
      durationMs: task.durationMs || 0,
      error: task.error || null
    }));

    const totalDurationMs = timelineData.reduce((acc, t) => acc + (t.durationMs || 0), 0);

    return res.json({
      jobId,
      status: job.status,
      metrics: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        failedTasks: tasks.filter(t => t.status === 'failed').length,
        cumulativeWorkerDurationMs: totalDurationMs,
        maxTasksBudget: job.maxTasks || 20,
        maxDurationMinutesBudget: job.maxDurationMinutes || 90
      },
      timeline: timelineData
    });
  } catch (err) {
    console.error('Error retrieving job timeline:', err);
    return res.status(500).json({ error: 'Failed to retrieve job timeline.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Research Swarm Server running on http://localhost:${PORT}`);
  console.log(`   POST   /workspaces     - Create workspace`);
  console.log(`   GET    /workspaces     - List workspaces`);
  console.log(`   DELETE /workspaces/:id - Cascade delete workspace (?confirm=true)`);
  console.log(`   POST   /jobs           - Submit research job (requires workspaceId)`);
  console.log(`   GET    /jobs/:id       - Query job state`);
});
