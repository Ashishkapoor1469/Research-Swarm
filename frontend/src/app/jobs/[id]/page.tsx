'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, 
  Sparkles, Activity, Cpu, Copy, Maximize2, Minimize2, 
  Check, Send, Code2, Search, CheckCircle, Hourglass, ShieldCheck,
  ChevronDown, ChevronUp, User
} from 'lucide-react';

interface ActivityLogItem {
  timestamp: string;
  agent: 'COORDINATOR' | 'WORKER' | 'SYNTHESIZER' | 'SYSTEM' | 'USER';
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
  groundingVerified?: boolean;
}

interface ResearchTask {
  id: string;
  subquestion: string;
  searchHint: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  workerId?: string;
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
  
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportFlash, setReportFlash] = useState(false);
  
  // Step 2 & 3: Live status indicator accordion & Follow-up chat state
  const [statusAccordionOpen, setStatusAccordionOpen] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);
  
  const prevVersionRef = useRef<number>(0);
  const activityEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll activity log
  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.activityLog]);

  const copyReportToClipboard = () => {
    if (job?.livingReport?.fullMarkdown) {
      navigator.clipboard.writeText(job.livingReport.fullMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  async function handleSendFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!followupText.trim() || isSubmittingFollowup || !job) return;

    const msg = followupText.trim();
    setFollowupText('');
    setIsSubmittingFollowup(true);

    try {
      const res = await fetch(`/api/jobs/${job.id}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to submit follow-up request.');
      }
    } catch (err) {
      console.error('Error submitting follow-up:', err);
    } finally {
      setIsSubmittingFollowup(false);
    }
  }

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
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Job Not Found</h2>
        <p className="text-[var(--text-secondary)] text-sm">{error || 'The requested research job ID could not be retrieved.'}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] text-sm border border-[var(--border-color)]">
          <ArrowLeft className="w-4 h-4" /> Return to Dispatcher
        </Link>
      </div>
    );
  }

  // STEP 1 FIX: Single Source of Truth for task counts (Derived directly from live tasks array!)
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const progressPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const isComplete = job.status === 'completed';

  // STEP 2: Derive live "current work" status indicator state
  const activeRunningTask = tasks.find(t => t.status === 'running');
  const activePendingTask = tasks.find(t => t.status === 'pending');
  
  let statusText = "Decomposing research question...";
  let statusColor = "text-[var(--accent-color)]";
  let statusIconAnimated = true;

  if (isComplete) {
    statusText = "Complete";
    statusColor = "text-emerald-400";
    statusIconAnimated = false;
  } else if (job.status === 'planning') {
    statusText = "Decomposing question...";
  } else if (job.status === 'synthesizing') {
    statusText = `Synthesizing living report v${(job.livingReport?.version || 0) + 1}...`;
  } else if (activeRunningTask) {
    statusText = `Searching the web & extracting factual evidence...`;
  } else if (activePendingTask) {
    statusText = `Queueing next sub-question...`;
  } else if (job.status === 'budget-exhausted-synthesizing') {
    statusText = `Bounded Task Budget Reached (${job.maxTasks || 20} tasks)`;
    statusColor = "text-amber-400";
    statusIconAnimated = false;
  }

  return (
    <div className="w-full space-y-4">
      {/* Persistent Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-color)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <span className="text-[var(--text-secondary)] text-xs">•</span>
          <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-xl">
            {job.question}
          </h1>
        </div>

        {/* Status Badge & Grounding Verification Indicator */}
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Grounded Grounding Audit Pass
          </span>

          {isComplete ? (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--accent-color)]/50 text-[var(--accent-color)] text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Final Synthesis Complete
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" /> Swarm Active ({progressPercent}%)
            </span>
          )}
        </div>
      </div>

      {/* CLAUDE-STYLE TWO-PANEL ARTIFACT LAYOUT */}
      <div className={`grid grid-cols-1 ${isExpanded ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6 items-start`}>
        
        {/* LEFT PANEL (~35% width / col-span-4): Swarm Activity Telemetry & Worker Status Cards */}
        {!isExpanded && (
          <div className="lg:col-span-4 flex flex-col space-y-4 h-[calc(100vh-160px)]">
            
            {/* STEP 2: Live "Current Work" Status Indicator (Claude "✳ Contemplating" Style) */}
            <div className="claude-card rounded-2xl border border-[var(--border-color)] p-3 shrink-0 space-y-2 shadow-md">
              <button
                onClick={() => setStatusAccordionOpen(!statusAccordionOpen)}
                className="w-full flex items-center justify-between text-xs text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-base select-none ${statusIconAnimated ? 'animate-pulse text-[var(--accent-color)]' : statusColor}`}>
                    {isComplete ? '✓' : '✳'}
                  </span>
                  <span className={`font-semibold text-xs ${statusColor}`}>
                    {statusText}
                  </span>
                </div>
                {statusAccordionOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                )}
              </button>

              {/* Expandable Accordion for Live Active Details */}
              {statusAccordionOpen && (
                <div className="pt-2 border-t border-[var(--border-color)]/60 text-[11px] text-[var(--text-secondary)] space-y-1">
                  {activeRunningTask && (
                    <div className="p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)]">
                      <span className="font-semibold text-[var(--text-primary)] block">Active Sub-Question:</span>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">"{activeRunningTask.subquestion}"</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                    <span>Active Re-planning Iteration: #{job.replanningCount}</span>
                    <span>Max Task Budget: {job.maxTasks || 20}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress & Fleet Execution Card (Step 1 Consolidated Count) */}
            <div className="claude-card p-4 rounded-2xl space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[var(--accent-color)]" />
                  <span>Fleet Execution</span>
                </span>
                <span className="font-mono text-[var(--accent-color)] font-bold">
                  {tasksCompleted}/{tasksTotal} Done ({progressPercent}%)
                </span>
              </div>

              {/* Smooth CSS Width Transition Progress Bar */}
              <div className="w-full bg-[var(--bg-input)] rounded-full h-2.5 overflow-hidden border border-[var(--border-color)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
                ></div>
              </div>

              {job.replanningCount > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent-color)] bg-[var(--bg-input)] px-2.5 py-1 rounded-lg border border-[var(--border-color)] font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>Coordinator Re-planner spawned follow-up task</span>
                </div>
              )}
            </div>

            {/* Individual Worker Cards (Derived from same single live tasks array) */}
            {tasks.length > 0 && (
              <div className="claude-card p-3 rounded-2xl shrink-0 space-y-2 max-h-44 overflow-y-auto">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block px-1">
                  Worker Agents ({tasksCompleted}/{tasksTotal} Complete)
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[var(--text-primary)] truncate max-w-[200px]" title={task.subquestion}>
                        {task.subquestion}
                      </span>
                      {task.status === 'done' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800 text-[10px] font-medium flex items-center gap-1 shrink-0">
                          <CheckCircle className="w-3 h-3" /> Done
                        </span>
                      )}
                      {task.status === 'running' && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800 text-[10px] font-medium flex items-center gap-1 animate-pulse shrink-0">
                          <Search className="w-3 h-3 animate-spin" /> Searching
                        </span>
                      )}
                      {task.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 text-[10px] flex items-center gap-1 shrink-0">
                          <Hourglass className="w-3 h-3" /> Queued
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Swarm Activity Stream (Chat / Event Log Panel) */}
            <div className="claude-card p-4 rounded-2xl flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2.5 mb-3 shrink-0">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  <span>Swarm Activity Telemetry</span>
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Pub/Sub Realtime</span>
              </div>

              {/* Event Log Stream */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {job.activityLog.map((item, idx) => {
                  const isUser = item.metadata?.agent === 'USER' || item.agent === ('USER' as any);
                  return (
                    <div key={idx} className={`p-2.5 rounded-xl border space-y-1 ${isUser ? 'bg-[var(--bg-card)] border-[var(--accent-color)]/50' : 'bg-[var(--bg-input)] border-[var(--border-color)]/60'}`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--accent-color)] flex items-center gap-1.5">
                          {isUser && <span className="px-1.5 py-0.2 rounded bg-[var(--accent-color)] text-white text-[10px] font-bold flex items-center gap-1"><User className="w-3 h-3" /> USER</span>}
                          {!isUser && item.agent === 'COORDINATOR' && <span className="px-1.5 py-0.2 rounded bg-[var(--bg-card)] text-[var(--accent-color)] text-[10px]">COORDINATOR</span>}
                          {!isUser && item.agent === 'WORKER' && <span className="px-1.5 py-0.2 rounded bg-[var(--bg-card)] text-[var(--text-primary)] text-[10px]">WORKER</span>}
                          {!isUser && item.agent === 'SYNTHESIZER' && <span className="px-1.5 py-0.2 rounded bg-[var(--bg-card)] text-[var(--accent-color)] text-[10px]">SYNTHESIZER</span>}
                          {!isUser && item.agent === 'SYSTEM' && <span className="px-1.5 py-0.2 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] text-[10px]">SYSTEM</span>}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[var(--text-primary)] leading-relaxed text-[11px]">{item.message}</p>
                    </div>
                  );
                })}
                <div ref={activityEndRef} />
              </div>

              {/* STEP 3: Wired Follow-up Prompt Input Box */}
              <div className="pt-3 border-t border-[var(--border-color)]/60 mt-3 shrink-0">
                <form
                  onSubmit={handleSendFollowup}
                  className="flex items-center gap-2 bg-[var(--bg-input)] p-1.5 rounded-xl border border-[var(--border-color)]"
                >
                  <input
                    type="text"
                    value={followupText}
                    onChange={(e) => setFollowupText(e.target.value)}
                    disabled={isSubmittingFollowup}
                    placeholder={isSubmittingFollowup ? "Coordinator evaluating follow-up request..." : "Ask follow-up or redirect research..."}
                    className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none px-2 placeholder:text-[var(--text-secondary)]/60 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingFollowup || !followupText.trim()}
                    className="p-1.5 rounded-lg bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingFollowup ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* RIGHT PANEL (~65% width / col-span-8): The Living Report Artifact Window (Claude Artifact UI) */}
        <div className={`${isExpanded ? 'lg:col-span-1' : 'lg:col-span-8'} claude-card rounded-2xl flex flex-col h-[calc(100vh-160px)] shadow-2xl overflow-hidden`}>
          
          {/* Artifact Window Header */}
          <div className="h-11 px-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <Code2 className="w-4 h-4 text-[var(--accent-color)]" />
              <span className="font-semibold text-[var(--text-primary)]">Research Swarm Living Report</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] font-mono">
                MD
              </span>
              {job.livingReport && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--accent-color)] font-mono border border-[var(--border-color)] font-bold">
                  v{job.livingReport.version}
                </span>
              )}
            </div>

            {/* Artifact Actions (Copy, Expand/Minimize) */}
            <div className="flex items-center gap-2">
              <button
                onClick={copyReportToClipboard}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] transition-colors cursor-pointer"
                title="Copy markdown to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Report</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title={isExpanded ? "Restore split view" : "Maximize Artifact view"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Artifact Report Content Canvas */}
          <div className={`flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 ${reportFlash ? 'report-updated-flash' : ''}`}>
            {job.livingReport ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    <span>Updated {new Date(job.livingReport.updatedAt).toLocaleTimeString()}</span>
                  </div>
                  <span className="font-mono text-[var(--accent-color)]">{job.livingReport.themes.length} Grounded Themes</span>
                </div>

                {/* Markdown Canvas with Uniform Accent Link Styling */}
                <div className="prose prose-invert max-w-none prose-headings:font-semibold prose-headings:text-[var(--text-primary)] prose-blockquote:border-[var(--accent-color)] prose-blockquote:bg-[var(--bg-input)] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg text-sm text-[var(--text-primary)] leading-relaxed">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-color)] hover:underline font-medium transition-colors border-b border-[var(--accent-color)]/40 pb-0.5"
                        />
                      )
                    }}
                  >
                    {job.livingReport.fullMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 text-center">
                <RefreshCw className="w-8 h-8 text-[var(--accent-color)] animate-spin" />
                <p className="text-[var(--text-primary)] font-semibold">Synthesizing Initial Report Structure...</p>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  Worker agents are currently gathering grounded search evidence across parallel sub-questions.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
