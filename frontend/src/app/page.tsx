'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, ChevronDown, ArrowUp, Mic, Cpu, Folder, FolderPlus
} from 'lucide-react';

const PRESET_QUESTIONS = [
  "How is the EU AI Act going to affect small AI startups?",
  "What are the primary technical hurdles and market forecasts for AI Agent Swarms in 2026?",
  "How will autonomous agent swarms transform venture capital due diligence?"
];

export interface ModelOptionInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
}

const MODEL_OPTIONS: ModelOptionInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Grounding', description: 'Fast grounded web search & parallel worker fleet' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', badge: 'Deep Reasoning', description: 'Advanced multi-step reasoning & complex analysis' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'Large Context', description: 'Deep context window for long-form synthesis' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', badge: 'Anthropic', description: 'High precision synthesis & structured formatting' }
];

interface Workspace {
  id: string;
  name: string;
  color?: string;
  fileCount: number;
}

export default function HomePage() {
  const [question, setQuestion] = useState('');
  const [fileName, setFileName] = useState('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [selectedModel, setSelectedModel] = useState<ModelOptionInfo>(MODEL_OPTIONS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Workspaces state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function fetchWorkspaces() {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data || []);
        if (data && data.length > 0) {
          setSelectedWorkspaceId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching workspaces:', e);
    } finally {
      setLoadingWorkspaces(false);
    }
  }

  async function handleCreateWorkspaceQuick() {
    if (!newWsName.trim()) return;
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWsName.trim() })
      });
      if (res.ok) {
        const created = await res.json();
        setWorkspaces([created, ...workspaces]);
        setSelectedWorkspaceId(created.id);
        setShowWorkspaceModal(false);
        setNewWsName('');
      }
    } catch (e) {
      console.error('Error creating workspace:', e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    if (!selectedWorkspaceId) {
      setError('Please select or create a workspace before dispatching a research swarm.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          fileName: fileName.trim() || question.trim(),
          depth,
          workspaceId: selectedWorkspaceId,
          model: selectedModel.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch research swarm.');
      }

      const data = await res.json();
      router.push(`/jobs/${data.job_id}`);
    } catch (err) {
      setError((err as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[70vh]">
      {/* Clean Custom Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl sm:text-5xl text-[var(--accent-color)] select-none">
            ✦
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">
            What would you like to research today?
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-normal">
          Autonomous Multi-Agent Swarm Engine powered by Google Cloud & Gemini
        </p>
      </div>

      {/* Lightweight Workspace Picker Above Input */}
      <div className="w-full flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="font-semibold text-[var(--text-secondary)]">Destination Workspace:</span>
          {loadingWorkspaces ? (
            <span className="text-[var(--text-secondary)] animate-pulse">Loading workspaces...</span>
          ) : workspaces.length > 0 ? (
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-[var(--accent-color)] transition-colors"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  📁 {ws.name} ({ws.fileCount} files)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-red-400 font-medium">No workspaces exist yet</span>
          )}
        </div>

        <button
          onClick={() => setShowWorkspaceModal(true)}
          className="inline-flex items-center gap-1 text-[var(--accent-color)] hover:underline font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Main Central Input Card Container */}
      <div className="w-full">
        <form
          onSubmit={handleSubmit}
          className="w-full claude-card rounded-2xl p-4 space-y-4 shadow-2xl relative border border-[var(--border-color)]"
        >
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter a broad research topic or complex prompt..."
            className="w-full bg-transparent text-[var(--text-primary)] text-sm outline-none resize-none placeholder:text-[var(--text-secondary)]/60 font-normal leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
                title="Add context"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Swarm Depth Pills */}
              <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-color)]/60">
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    depth === 'quick'
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Quick (4)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('standard')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    depth === 'standard'
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Standard (6)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('deep')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    depth === 'deep'
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Deep (8+)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Model Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-medium transition-colors cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  <span>{selectedModel.name}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--border-color)] text-[var(--accent-color)]">
                    {selectedModel.badge}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </button>

                {showModelDropdown && (
                  <div className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2 z-50 space-y-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">
                      Select Swarm Reasoning Model
                    </div>
                    {MODEL_OPTIONS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors flex items-start gap-2.5 ${
                          selectedModel.id === model.id
                            ? 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--accent-color)]/50'
                            : 'hover:bg-[var(--bg-input)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Cpu className={`w-4 h-4 mt-0.5 ${selectedModel.id === model.id ? 'text-[var(--accent-color)]' : ''}`} />
                        <div>
                          <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                            <span>{model.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--border-color)] text-[var(--accent-color)] font-mono">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                            {model.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !question.trim() || !selectedWorkspaceId}
                className={`p-2 rounded-xl text-white transition-all cursor-pointer ${
                  question.trim() && selectedWorkspaceId
                    ? 'bg-[var(--accent-color)] hover:opacity-90 shadow-md'
                    : 'bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Preset Questions */}
      <div className="w-full space-y-2 pt-2">
        <span className="text-xs text-[var(--text-secondary)] font-medium">Or try a sample research prompt:</span>
        <div className="flex flex-col gap-2">
          {PRESET_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuestion(q)}
              className="text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2.5 rounded-xl border border-[var(--border-color)] transition-colors text-left font-normal"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Quick Workspace Creation Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="claude-card w-full max-w-sm p-5 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[var(--accent-color)]" />
              <span>Create Workspace</span>
            </h3>

            <input
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Workspace name (e.g. Food Research)..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWorkspaceModal(false)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] text-xs text-[var(--text-secondary)] border border-[var(--border-color)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkspaceQuick}
                disabled={!newWsName.trim()}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
