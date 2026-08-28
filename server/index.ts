import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../lib/firestore';
import { ResearchJob, JobDepth } from '../lib/types';
import { initializeSwarmOrchestrator, launchNewJob } from './swarm_runner';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize background swarm orchestrator
initializeSwarmOrchestrator();

// 1. POST /jobs - Job Intake Endpoint (Non-blocking walk away moment)
app.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { question, depth = 'standard' } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Valid research question is required (at least 5 characters).' });
    }

    const validDepth: JobDepth = ['quick', 'standard', 'deep'].includes(depth) ? depth : 'standard';
    const jobId = `job-${uuidv4()}`;

    const newJob: ResearchJob = {
      id: jobId,
      question: question.trim(),
      depth: validDepth,
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
          message: `Job created. Depth: "${validDepth}" (Max Tasks: ${req.body.maxTasks || (validDepth === 'quick' ? 8 : validDepth === 'deep' ? 25 : 20)}, Timeout: ${req.body.maxDurationMinutes || 90}m). Invoking Coordinator Agent...`
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

// 2. GET /jobs/:id - Query Job State
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

// 3. GET /jobs/:id/events - Realtime SSE Stream for Frontend Live Updates
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

  // Send initial data
  await sendUpdate();

  // Subscribe to DB updates for this job
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

// 4. GET /jobs/:id/timeline - Per-task Observability & Parallel Execution Metrics
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
  console.log(`   POST /jobs        - Submit broad research question`);
  console.log(`   GET  /jobs/:id    - Poll job progress & living report`);
  console.log(`   GET  /jobs/:id/events - Realtime SSE stream for UI`);
});
