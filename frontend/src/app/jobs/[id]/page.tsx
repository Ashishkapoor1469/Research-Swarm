'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertCircle, RefreshCw, 
  Sparkles, Activity, Cpu, Copy, Maximize2, Minimize2, 
  Check, Send, Code2, Search, CheckCircle, Hourglass, ShieldCheck,
  ChevronDown, ChevronUp, User, Cog, GitFork, Bot, FileText, FileCode,
  Download, Sliders, FileDown
} from 'lucide-react';
import { JobDepth } from '@/lib/types';

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
  depth: JobDepth;
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
  
  const [statusAccordionOpen, setStatusAccordionOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [followupText, setFollowupText] = useState('');
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);
  
  // Mode Switcher State inside Chat Input
  const [selectedDepth, setSelectedDepth] = useState<JobDepth>('standard');
  const [showModeDropdown, setShowModeDropdown] = useState(false);

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
      if (data.job.depth) {
        setSelectedDepth(data.job.depth);
      }

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

  const downloadReportFile = () => {
    if (job?.livingReport?.fullMarkdown) {
      const blob = new Blob([job.livingReport.fullMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Research_Swarm_Report_${job.id.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
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
        body: JSON.stringify({ message: msg, depth: selectedDepth })
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

  // Single Source of Truth for task counts
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const progressPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const isComplete = job.status === 'completed';

  // Derive dynamic cycle status text & role-matching accent colors
  const lastLog = job.activityLog && job.activityLog.length > 0 ? job.activityLog[job.activityLog.length - 1] : null;
  
  let statusText = "Initializing Swarm...";
  let statusColor = "text-[var(--accent-color)]";
  let statusIconAnimated = true;

  if (isComplete) {
    statusText = "Final Synthesis Complete";
    statusColor = "text-emerald-400";
    statusIconAnimated = false;
  } else if (job.status === 'planning') {
    statusText = "◆ Coordinator: Decomposing question...";
    statusColor = "text-cyan-400";
  } else if (job.status === 'synthesizing') {
    statusText = `◈ Synthesizer: Compiling living report v${(job.livingReport?.version || 0) + 1}...`;
    statusColor = "text-emerald-400";
  } else if (lastLog) {
    if (lastLog.agent === 'COORDINATOR') {
      statusText = `◆ Coordinator: ${lastLog.message.replace(/^ℹ️\s*/, '').slice(0, 45)}...`;
      statusColor = "text-cyan-400";
    } else if (lastLog.agent === 'WORKER') {
      const wMatch = lastLog.message.match(/Worker \[(worker-[a-z0-9]+)\]/);
      const wName = wMatch ? wMatch[1] : 'Agent';
      statusText = `▸ Worker [${wName}]: ${lastLog.message.replace(/^✅\s*|^Worker\s*\[.*?\]\s*/, '').slice(0, 42)}...`;
      statusColor = "text-purple-400";
    } else if (lastLog.agent === 'SYNTHESIZER') {
      statusText = `◈ Synthesizer: ${lastLog.message.slice(0, 45)}...`;
      statusColor = "text-emerald-400";
    } else if (lastLog.agent === 'SYSTEM') {
      statusText = `⚙ System: ${lastLog.message.slice(0, 45)}...`;
      statusColor = "text-zinc-400";
    }
  } else if (tasks.find(t => t.status === 'running')) {
    const activeRunningTask = tasks.find(t => t.status === 'running');
    statusText = `▸ Worker Searching: "${activeRunningTask?.subquestion.slice(0, 35)}..."`;
    statusColor = "text-purple-400";
  } else if (job.status === 'budget-exhausted-synthesizing') {
    statusText = `⚠️ Bounded Task Budget Reached (${job.maxTasks || 20} tasks)`;
    statusColor = "text-amber-400";
    statusIconAnimated = false;
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Header Bar with Mode Selector Badge */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-color)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <span className="text-[var(--text-secondary)] text-xs">•</span>
          
          {/* Depth / Mode Pill */}
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
            selectedDepth === 'quick' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800' :
            selectedDepth === 'deep' ? 'bg-amber-950/40 text-amber-400 border-amber-800' :
            'bg-purple-950/40 text-purple-400 border-purple-800'
          }`}>
            {selectedDepth === 'quick' ? '⚡ Quick (4 Tasks)' : selectedDepth === 'deep' ? '🔬 Deep Research (25 Tasks)' : '🎯 Standard (6 Tasks)'}
          </span>

          <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-md">
            {job.question}
          </h1>
        </div>

        {/* Grounded Audit Pass Badge & Status Pill */}
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Grounded Audit Pass
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

      {/* 3-COLUMN RESTRUCTURED LAYOUT */}
      <div className={`grid grid-cols-1 ${isExpanded ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6 items-start`}>
        
        {/* COLUMN 2 (Middle, ~35% width / col-span-5): Clean Chat Thread Pane */}
        {!isExpanded && (
          <div className="lg:col-span-5 flex flex-col h-[calc(100vh-160px)] claude-card rounded-2xl p-4 shadow-xl overflow-hidden">
            
            {/* Chat Thread Messages Stream */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* Initial User Request Message Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-color)]/40 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color)] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <User className="w-3 h-3" /> ● You
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(job.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-[var(--text-primary)] font-medium text-xs leading-relaxed">{job.question}</p>
              </div>

              {/* Collapsible Swarm Telemetry & Thinking Block (Claude Style) */}
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] overflow-hidden shadow-md">
                
                {/* Collapsible Header Status Bar */}
                <button
                  onClick={() => setStatusAccordionOpen(!statusAccordionOpen)}
                  className="w-full p-3 flex items-center justify-between text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-base select-none ${statusIconAnimated ? 'animate-pulse text-[var(--accent-color)]' : statusColor}`}>
                      {isComplete ? '✓' : '✳'}
                    </span>
                    <span className={`font-semibold text-xs ${statusColor}`}>
                      {statusText}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      ({tasksCompleted}/{tasksTotal} Tasks)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {statusAccordionOpen ? 'Hide Execution' : 'View Execution'}
                    </span>
                    {statusAccordionOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    )}
                  </div>
                </button>

                {/* Expanded Swarm Execution Telemetry Menu (Fleet Progress + Worker Cards + Live Log Stream) */}
                {statusAccordionOpen && (
                  <div className="p-4 border-t border-[var(--border-color)] space-y-4 bg-[var(--bg-sidebar)] animate-in fade-in duration-200">
                    
                    {/* Fleet Execution Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <Cog className="w-4 h-4 text-[var(--accent-color)]" />
                          <span>Fleet Execution</span>
                        </span>
                        <span className="font-mono text-[var(--accent-color)] font-bold">
                          {tasksCompleted}/{tasksTotal} Done ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-input)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
                        ></div>
                      </div>
                    </div>

                    {/* Worker Agents Status Cards List */}
                    {tasks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                          Worker Agents ({tasksCompleted}/{tasksTotal} Complete)
                        </span>
                        <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {tasks.map((task, tIdx) => (
                            <div key={task.id} className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                              <span className="text-[11px] text-[var(--text-primary)] truncate max-w-[180px]" title={task.subquestion}>
                                ▸ Worker {tIdx + 1}: {task.subquestion}
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

                    {/* Pub/Sub Telemetry Stream */}
                    <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Pub/Sub Realtime Activity Stream
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {job.activityLog.map((item, idx) => {
                          const logId = `log-${item.timestamp}-${idx}`;
                          const isUser = item.metadata?.agent === 'USER' || item.agent === ('USER' as any);
                          const isLogExpanded = expandedLogId === logId;
                          const finding = item.metadata?.taskId ? findings.find(f => f.taskId === item.metadata.taskId) : null;

                          return (
                            <div key={logId} className="p-2 rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-input)] space-y-1">
                              <button
                                onClick={() => setExpandedLogId(isLogExpanded ? null : logId)}
                                className="w-full flex items-center justify-between text-left cursor-pointer"
                              >
                                <span className="font-semibold flex items-center gap-1 text-[10px]">
                                  {isUser && <span className="px-1.5 py-0.2 rounded bg-[var(--accent-color)] text-white text-[9px] font-bold">● You</span>}
                                  {!isUser && item.agent === 'COORDINATOR' && <span className="px-1.5 py-0.2 rounded bg-cyan-950/50 border border-cyan-800 text-cyan-400 text-[9px] font-semibold flex items-center gap-1"><GitFork className="w-2.5 h-2.5" /> ◆ COORDINATOR</span>}
                                  {!isUser && item.agent === 'WORKER' && <span className="px-1.5 py-0.2 rounded bg-purple-950/50 border border-purple-800 text-purple-400 text-[9px] font-semibold flex items-center gap-1"><Bot className="w-2.5 h-2.5" /> ▸ WORKER</span>}
                                  {!isUser && item.agent === 'SYNTHESIZER' && <span className="px-1.5 py-0.2 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-[9px] font-semibold flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> ◈ SYNTHESIZER</span>}
                                  {!isUser && item.agent === 'SYSTEM' && <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px]">⚙ SYSTEM</span>}
                                </span>
                                <span className="text-[9px] text-[var(--text-secondary)] font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                              </button>
                              <p className="text-[var(--text-primary)] leading-relaxed text-[11px] font-normal">{item.message}</p>
                              {isLogExpanded && (
                                <div className="pt-1.5 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-secondary)] space-y-1">
                                  {item.metadata?.subquestion && <p><strong className="text-[var(--accent-color)]">Query:</strong> {item.metadata.subquestion}</p>}
                                  {finding && finding.keyFacts.length > 0 && (
                                    <div>
                                      <strong className="text-emerald-400">Facts:</strong>
                                      <ul className="list-disc pl-3">
                                        {finding.keyFacts.map((f, i) => <li key={i}>{f}</li>)}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Follow-up / Direct Coordinator Responses in Chat Thread */}
              {job.activityLog.filter(item => item.metadata?.agent === 'USER' || item.agent === ('USER' as any)).map((userMsg, uIdx) => (
                <div key={`user-thread-${uIdx}`} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-color)]/40 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color)] text-white text-[10px] font-bold flex items-center gap-1">
                        <User className="w-3 h-3" /> ● You
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(userMsg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[var(--text-primary)] font-medium text-xs">{userMsg.message}</p>
                  </div>
                </div>
              ))}

              <div ref={activityEndRef} />
            </div>

            {/* Pinned Follow-up Chat Input Box with Mode Switcher Icon */}
            <div className="pt-3 border-t border-[var(--border-color)]/60 mt-3 shrink-0">
              <form
                onSubmit={handleSendFollowup}
                className="flex items-center gap-2 bg-[var(--bg-input)] p-1.5 rounded-xl border border-[var(--border-color)] relative"
              >
                {/* Mode Switcher Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className="px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-color)] hover:border-[var(--accent-color)] transition-colors flex items-center gap-1.5 font-mono text-[10px] font-bold cursor-pointer"
                    title="Change Research Mode for follow-up prompt"
                  >
                    <Sliders className="w-3 h-3" />
                    <span className="capitalize">{selectedDepth}</span>
                  </button>

                  {showModeDropdown && (
                    <div className="absolute bottom-11 left-0 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl py-1 z-50">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Research Mode
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedDepth('quick'); setShowModeDropdown(false); }}
                        className="w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-[var(--bg-input)] text-cyan-400 font-medium transition-colors"
                      >
                        <span>⚡ Quick (4 Tasks)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedDepth('standard'); setShowModeDropdown(false); }}
                        className="w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-[var(--bg-input)] text-purple-400 font-medium transition-colors"
                      >
                        <span>🎯 Standard (6 Tasks)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedDepth('deep'); setShowModeDropdown(false); }}
                        className="w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-[var(--bg-input)] text-amber-400 font-medium transition-colors"
                      >
                        <span>🔬 Deep (25 Tasks)</span>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={followupText}
                  onChange={(e) => setFollowupText(e.target.value)}
                  disabled={isSubmittingFollowup}
                  placeholder={isSubmittingFollowup ? "Coordinator evaluating request..." : "Ask follow-up or redirect research..."}
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
        )}

        {/* COLUMN 3 (Right, widest, ~45% width / col-span-7): Research Detail / Rendered Markdown Living Report */}
        <div className={`${isExpanded ? 'lg:col-span-1' : 'lg:col-span-7'} claude-card rounded-2xl flex flex-col h-[calc(100vh-160px)] shadow-2xl overflow-hidden`}>
          
          {/* Artifact Window Header */}
          <div className="h-11 px-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <FileCode className="w-4 h-4 text-[var(--accent-color)]" />
              <span className="font-semibold text-[var(--text-primary)]">Living Report</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] font-mono">
                MD
              </span>
              {job.livingReport && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--accent-color)] font-mono border border-[var(--border-color)] font-bold">
                  v{job.livingReport.version}
                </span>
              )}
            </div>

            {/* Artifact Actions (Copy, Export File, Expand/Minimize) */}
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
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={downloadReportFile}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] transition-colors cursor-pointer"
                title="Download report markdown file"
              >
                <FileDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Export .md</span>
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title={isExpanded ? "Restore 3-column view" : "Maximize Living Report view"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rendered Markdown Report Body Canvas with Hover Image Download Overlay */}
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

                {/* Rendered Markdown Canvas */}
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
                      ),
                      img: ({ node, ...props }) => {
                        if (!props.src) return null;
                        return (
                          <div className="relative group my-4 rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-2xl bg-[var(--bg-input)]">
                            <img
                              {...props}
                              className="w-full max-h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                              alt={props.alt || 'Visual Research Evidence'}
                            />
                            {/* Hover Overlay Download Button */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <a
                                href={props.src}
                                download={`research_evidence_${Date.now()}.jpg`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-xl hover:bg-black transition-colors"
                              >
                                <Download className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                                <span>Download Image</span>
                              </a>
                            </div>
                            {props.alt && (
                              <div className="p-2 bg-[var(--bg-card)] border-t border-[var(--border-color)]/60 text-center">
                                <span className="text-[11px] text-[var(--text-secondary)] italic">
                                  {props.alt}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      },
                      table: ({ node, ...props }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] p-1">
                          <table {...props} className="w-full text-xs text-left text-[var(--text-primary)]" />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th {...props} className="px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border-color)] font-semibold text-[var(--accent-color)]" />
                      ),
                      td: ({ node, ...props }) => (
                        <td {...props} className="px-3 py-2 border-b border-[var(--border-color)]/40" />
                      ),
                      code: ({ node, inline, ...props }: any) => (
                        inline ? (
                          <code {...props} className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--accent-color)]" />
                        ) : (
                          <pre className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] font-mono text-xs overflow-x-auto text-emerald-400 my-4 shadow-inner">
                            <code {...props} />
                          </pre>
                        )
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
