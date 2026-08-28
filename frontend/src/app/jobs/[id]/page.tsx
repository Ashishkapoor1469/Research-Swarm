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

    // Initial fetch
    fetchJobState();

    // SSE connection for realtime streaming
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
        console.warn('SSE connection failed, falling back to polling');
        if (eventSource) eventSource.close();
        // Fallback polling
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
        <div className="w-12 h-12 rounded-2xl glow-gradient flex items-center justify-center animate-spin">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse">Connecting to Research Swarm Telemetry...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto p-8 glass-card rounded-2xl border border-red-900/50 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Job Not Found</h2>
        <p className="text-gray-400 text-sm">{error || 'The requested research job ID could not be retrieved.'}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm hover:bg-gray-700">
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    );
  }

  const progressPercent = job.tasksTotal > 0 ? Math.round((job.tasksCompleted / job.tasksTotal) * 100) : 0;
  const isComplete = job.status === 'completed';

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dispatcher
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            "{job.question}"
          </h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>Job ID: <code className="text-cyan-400">{job.id.slice(0, 18)}...</code></span>
            <span>•</span>
            <span className="capitalize">Depth: {job.depth}</span>
            <span>•</span>
            <span>Created {new Date(job.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="px-4 py-2 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30">
              <CheckCircle2 className="w-4 h-4" /> Final Report Synthesized
            </div>
          ) : (
            <div className="px-4 py-2 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-900/30 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" /> Swarm Active ({progressPercent}%)
            </div>
          )}
        </div>
      </div>

      {/* Walk Away Banner */}
      {!isComplete && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-purple-950/40 to-gray-900/60 border border-cyan-800/40 flex items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-900/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Walk-Away Mode Active</h4>
              <p className="text-xs text-gray-300">
                You can close this tab or leave your screen. The Coordinator, Worker Fleet & Synthesizer will continue running asynchronously in the background.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 font-mono shrink-0 hidden sm:inline-block">
            Cloud Run + Pub/Sub
          </span>
        </div>
      )}

      {/* Swarm Progress Bar */}
      <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Swarm Execution Progress</span>
          </div>
          <span className="font-mono text-cyan-400 font-bold">
            {job.tasksCompleted} / {job.tasksTotal} Tasks Done ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden p-0.5 border border-gray-800">
          <div
            className="h-full rounded-full glow-gradient transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Re-planning Indicator */}
        {job.replanningCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-800/40">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
            <span>
              Coordinator Re-planner triggered! Dynamically added follow-up sub-questions based on intermediate findings.
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'report'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Living Research Report</span>
          {job.livingReport && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-300 font-mono">
              v{job.livingReport.version}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('swarm')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'swarm'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Swarm Telemetry & Timeline</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
            {job.activityLog.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'findings'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Worker Fleet ({tasks.length})</span>
        </button>
      </div>

      {/* Tab 1: Living Research Report */}
      {activeTab === 'report' && (
        <div className={`glass-card p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6 ${reportFlash ? 'report-updated-flash' : ''}`}>
          {job.livingReport ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Last synthesized: {new Date(job.livingReport.updatedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                    Version {job.livingReport.version}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950 text-purple-400 border border-purple-800/60 font-semibold">
                    {job.livingReport.themes.length} Themes Synthesized
                  </span>
                </div>
              </div>

              {/* Render Full Markdown with styling */}
              <div className="prose prose-invert max-w-none prose-headings:text-cyan-300 prose-a:text-cyan-400 prose-a:underline hover:prose-a:text-cyan-300 prose-strong:text-white prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-950/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
                <ReactMarkdown>{job.livingReport.fullMarkdown}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-gray-300 font-semibold">Synthesizing Initial Report Structure...</p>
              <p className="text-xs text-gray-500">Worker agents are currently fetching grounded web sources.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Swarm Activity Telemetry & Timeline */}
      {activeTab === 'swarm' && (
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Swarm Activity Stream
            </h3>
            <span className="text-xs text-gray-400 font-mono">Realtime Pub/Sub Events</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {job.activityLog.slice().reverse().map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-950/70 border border-gray-800/80 flex items-start gap-3 text-xs">
                <div className="shrink-0 pt-0.5">
                  {item.agent === 'COORDINATOR' && <div className="w-6 h-6 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold text-[10px]">C</div>}
                  {item.agent === 'WORKER' && <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">W</div>}
                  {item.agent === 'SYNTHESIZER' && <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[10px]">S</div>}
                  {item.agent === 'SYSTEM' && <div className="w-6 h-6 rounded-lg bg-gray-900 text-gray-400 border border-gray-800 flex items-center justify-center font-bold text-[10px]">SYS</div>}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-300">{item.agent}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{item.message}</p>
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
                <div key={task.id} className="glass-card p-5 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      Task #{idx + 1}
                    </span>

                    {task.status === 'done' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    )}
                    {task.status === 'running' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 font-semibold animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Searching Web...
                      </span>
                    )}
                    {task.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-900 text-gray-400 border border-gray-800 font-semibold">
                        Queued
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-white leading-snug">
                    {task.subquestion}
                  </h4>

                  <p className="text-xs text-gray-500 font-mono">
                    Search Strategy: "{task.searchHint}"
                  </p>

                  {finding && (
                    <div className="pt-2 border-t border-gray-800/80 space-y-2">
                      <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">
                        {finding.summary}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{finding.keyFacts.length} Facts Extracted</span>
                        <span>{finding.sources.length} Grounded Sources</span>
                        {task.durationMs && (
                          <span className="font-mono text-cyan-400">⚡ {task.durationMs}ms</span>
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
