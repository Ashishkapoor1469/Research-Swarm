export type JobDepth = "quick" | "standard" | "deep";
export type JobStatus = "planning" | "in_progress" | "synthesizing" | "completed" | "failed" | "budget-exhausted-synthesizing";
export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface Workspace {
  id: string;
  ownerId: string;        // user id
  name: string;           // e.g. "Food Research"
  description?: string;
  createdAt: string;      // ISO timestamp string
  updatedAt: string;      // ISO timestamp string
  fileCount: number;      // denormalized count for fast list rendering
  color?: string;         // optional UI accent color, user-selectable
}

export interface ResearchTask {
  id: string;
  jobId: string;
  subquestion: string;
  searchHint: string;
  status: TaskStatus;
  workerId?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface WorkerFinding {
  id: string;
  jobId: string;
  taskId: string;
  subquestion: string;
  summary: string;
  keyFacts: string[];
  sources: Array<{ title: string; url: string; snippet?: string }>;
  confidence: "low" | "medium" | "high";
  createdAt: string;
}

export interface LivingReport {
  version: number;
  executiveSummary: string;
  themes: Array<{
    title: string;
    content: string;
    citationSources: Array<{ title: string; url: string }>;
  }>;
  stillInvestigating: string[];
  fullMarkdown: string;
  updatedAt: string;
}

export interface ResearchJob {
  id: string;
  workspaceId: string;    // required — every job belongs to a workspace
  fileName?: string;      // user-editable display name for this report file, defaults to question text if unset
  question: string;
  depth: JobDepth;
  model?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  tasksTotal: number;
  tasksCompleted: number;
  maxTasks: number;
  maxDurationMinutes: number;
  livingReport?: LivingReport;
  replanningCount: number;
  activityLog: Array<{
    timestamp: string;
    agent: "COORDINATOR" | "WORKER" | "SYNTHESIZER" | "SYSTEM";
    message: string;
    metadata?: Record<string, any>;
  }>;
}

export interface TaskPubSubMessage {
  jobId: string;
  taskId: string;
  subquestion: string;
  searchHint: string;
  attempt: number;
}
