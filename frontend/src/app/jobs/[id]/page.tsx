'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, 
  Sparkles, ExternalLink, Activity, FileText, Cpu, Layers, ShieldCheck, Zap
} from 'lucide-react';

interface ActivityLogItem {
  timestamp: string;
  agent: 'COORDINATOR' | 'WORKER' | 'SYNTHESIZER' | 'SYSTEM';
  message: string;
  metadata?: any;
}

interface WorkerFinding {
  id: string;
  taskId?: string;
  subquestion: string;
  summary: string;
  keyFacts: string[];
  sources: Array<{ title: string; url: string; snippet?: string }>;
  confidence: string;
}

interface ResearchTask {
  id: string;
  subquestion: string;
  searchHint: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  durationMs?: number;
  error?: string;
}

interface LivingReport {
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

interface JobData {
  id: string;
  question: string;
  depth: string;
  status: 'planning' | 'in_progress' | 'synthesizing' | 'completed' | 'failed' | 'budget-exhausted-synthesizing';
  createdAt: string;
  updatedAt: string;
  tasksTotal: number;
  tasksCompleted: number;
  maxTasks?: number;
  maxDurationMinutes?: number;
  replanningCount: number;
  livingReport?: LivingReport;
  activityLog: ActivityLogItem[];
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [findings, setFindings] = useState<WorkerFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'swarm' | 'findings'>('report');
  const [reportFlash, setReportFlash] = useState(false);
  
  const prevVersionRef = useRef<number>(0);

  useEffect(() => {
    if (!jobId) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    async function fetchJobState() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Job not found.');
        const data = await res.json();
        updateData(data);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }

    function updateData(data: { job: JobData; tasks: ResearchTask[]; findings: WorkerFinding[] }) {
      setJob(data.job);
      setTasks(data.tasks || []);
      setFindings(data.findings || []);

      if (data.job.livingReport && data.job.livingReport.version > prevVersionRef.current) {
        if (prevVersionRef.current > 0) {
          setReportFlash(true);
          setTimeout(() => setReportFlash(false), 2500);
        }
        prevVersionRef.current = data.job.livingReport.version;
      }
    }

    fetchJobState();

    try {
      eventSource = new EventSource(`/api/jobs/${jobId}/events`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateData(data);
          setLoading(false);
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        pollInterval = setInterval(fetchJobState, 2500);
      };
    } catch (e) {
      pollInterval = setInterval(fetchJobState, 2500);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-color)] border-t-transparent animate-spin"></div>
        <p className="text-[var(--text-secondary)] text-sm animate-pulse font-serif">Connecting to Research Swarm Telemetry...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto p-8 claude-card rounded-2xl border border-red-900/50 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-serif font-semibold text-[var(--text-primary)]">Job Not Found</h2>
        <p className="text-[var(--text-secondary)] text-sm">{error || 'The requested research job ID could not be retrieved.'}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] text-sm border border-[var(--border-color)]">
          <ArrowLeft className="w-4 h-4" /> Return to Dispatcher
        </Link>
      </div>
    );
  }

  const progressPercent = job.tasksTotal > 0 ? Math.round((job.tasksCompleted / job.tasksTotal) * 100) : 0;
  const isComplete = job.status === 'completed';

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)]/60 pb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-color)] hover:underline mb-2 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dispatcher
          </Link>
          <h1 className="font-serif-claude text-2xl sm:text-3xl font-normal text-[var(--text-primary)] tracking-tight leading-snug">
            "{job.question}"
          </h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
            <span>Job ID: <code className="text-[var(--accent-color)] font-mono">{job.id.slice(0, 18)}...</code></span>
            <span>•</span>
            <span className="capitalize">Depth: {job.depth}</span>
            <span>•</span>
            <span>Created {new Date(job.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--accent-color)]/50 text-[var(--accent-color)] text-xs font-semibold flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> Final Report Synthesized
            </div>
          ) : (
            <div className="px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] text-xs font-semibold flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-color)]" /> Swarm Active ({progressPercent}%)
            </div>
          )}
        </div>
      </div>

      {/* Walk Away Banner */}
      {!isComplete && (
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Walk-Away Mode Active</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                You can close this tab or leave your screen. The Coordinator, Worker Fleet & Synthesizer will continue running asynchronously.
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--bg-input)] text-[var(--accent-color)] border border-[var(--border-color)] font-mono shrink-0 hidden sm:inline-block">
            Cloud Run + Pub/Sub
          </span>
        </div>
      )}

      {/* Swarm Progress Bar */}
      <div className="claude-card p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <Cpu className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Swarm Execution Progress</span>
          </div>
          <span className="font-mono text-[var(--accent-color)] font-bold">
            {job.tasksCompleted} / {job.tasksTotal} Tasks Done ({progressPercent}%)
          </span>
        </div>

        <div className="w-full bg-[var(--bg-input)] rounded-full h-2.5 overflow-hidden p-0.5 border border-[var(--border-color)]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
          ></div>
        </div>

        {job.replanningCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-[var(--accent-color)] bg-[var(--bg-input)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Coordinator Re-planner triggered! Dynamically added follow-up sub-questions based on intermediate findings.
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all ${
            activeTab === 'report'
              ? 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Living Research Report</span>
          {job.livingReport && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--border-color)] text-[var(--accent-color)] font-mono">
              v{job.livingReport.version}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('swarm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all ${
            activeTab === 'swarm'
              ? 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Swarm Telemetry</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--border-color)] text-[var(--text-secondary)] font-mono">
            {job.activityLog.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all ${
            activeTab === 'findings'
              ? 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Worker Fleet ({tasks.length})</span>
        </button>
      </div>

      {/* Tab 1: Living Research Report */}
      {activeTab === 'report' && (
        <div className={`claude-card p-6 sm:p-8 rounded-2xl space-y-6 ${reportFlash ? 'report-updated-flash' : ''}`}>
          {job.livingReport ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock className="w-4 h-4 text-[var(--accent-color)]" />
                  <span>Last synthesized: {new Date(job.livingReport.updatedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-input)] text-[var(--accent-color)] border border-[var(--border-color)] font-semibold">
                    Version {job.livingReport.version}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold">
                    {job.livingReport.themes.length} Themes Synthesized
                  </span>
                </div>
              </div>

              {/* Render Full Markdown with styling */}
              <div className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:text-[var(--text-primary)] prose-a:text-[var(--accent-color)] prose-a:underline hover:prose-a:opacity-80 prose-blockquote:border-[var(--accent-color)] prose-blockquote:bg-[var(--bg-input)] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg text-sm text-[var(--text-primary)] leading-relaxed">
                <ReactMarkdown>{job.livingReport.fullMarkdown}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-[var(--accent-color)] animate-spin mx-auto" />
              <p className="text-[var(--text-primary)] font-semibold font-serif">Synthesizing Initial Report Structure...</p>
              <p className="text-xs text-[var(--text-secondary)]">Worker agents are currently fetching grounded web sources.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Swarm Activity Telemetry & Timeline */}
      {activeTab === 'swarm' && (
        <div className="claude-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--accent-color)]" />
              Live Swarm Activity Stream
            </h3>
            <span className="text-xs text-[var(--text-secondary)] font-mono">Realtime Pub/Sub Events</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
            {job.activityLog.slice().reverse().map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)]/60 flex items-start gap-3 text-xs">
                <div className="shrink-0 pt-0.5">
                  {item.agent === 'COORDINATOR' && <div className="w-6 h-6 rounded-lg bg-[var(--bg-card)] text-[var(--accent-color)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[10px]">C</div>}
                  {item.agent === 'WORKER' && <div className="w-6 h-6 rounded-lg bg-[var(--bg-card)] text-[var(--accent-color)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[10px]">W</div>}
                  {item.agent === 'SYNTHESIZER' && <div className="w-6 h-6 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[10px]">S</div>}
                  {item.agent === 'SYSTEM' && <div className="w-6 h-6 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[10px]">SYS</div>}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{item.agent}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Worker Fleet Grid */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task, idx) => {
              const finding = findings.find(f => f.taskId === task.id);
              return (
                <div key={task.id} className="claude-card p-5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--accent-color)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                      Task #{idx + 1}
                    </span>

                    {task.status === 'done' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--accent-color)] border border-[var(--border-color)] flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    )}
                    {task.status === 'running' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-1 font-semibold animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent-color)]" /> Searching...
                      </span>
                    )}
                    {task.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)] font-semibold">
                        Queued
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                    {task.subquestion}
                  </h4>

                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    Search Strategy: "{task.searchHint}"
                  </p>

                  {finding && (
                    <div className="pt-2 border-t border-[var(--border-color)]/60 space-y-2">
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {finding.summary}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                        <span>{finding.keyFacts.length} Facts Extracted</span>
                        <span>{finding.sources.length} Grounded Sources</span>
                        {task.durationMs && (
                          <span className="font-mono text-[var(--accent-color)]">⚡ {task.durationMs}ms</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
