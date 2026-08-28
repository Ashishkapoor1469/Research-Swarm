export type JobStatus = 'planning' | 'in_progress' | 'synthesis' | 'completed' | 'failed';
export type JobDepth = 'quick' | 'standard' | 'deep';

export interface ResearchJob {
  id: string;
  workspaceId: string;
  question: string;
  depth: JobDepth;
  status: JobStatus;
  tasksTotal: number;
  tasksCompleted: number;
  subquestions: Array<{ subquestion: string; searchHint: string }>;
  findings: Array<{
    subquestion: string;
    summary: string;
    keyFacts: string[];
    sources: Array<{ title: string; url: string }>;
  }>;
  livingReport?: {
    executiveSummary: string;
    themes: Array<{ title: string; content: string; citationSources: Array<{ title: string; url: string }> }>;
    fullMarkdown: string;
  };
  createdAt: string;
  updatedAt: string;
}
