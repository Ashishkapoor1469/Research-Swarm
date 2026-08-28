'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Folder, ArrowLeft, Plus, FileText, Clock, Trash2, Edit3, Check, X, 
  RefreshCw, CheckCircle2, AlertCircle, ArrowUp, Cpu, Send
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ResearchJob {
  id: string;
  workspaceId: string;
  fileName?: string;
  question: string;
  depth: string;
  status: 'planning' | 'in_progress' | 'synthesizing' | 'completed' | 'failed' | 'budget-exhausted-synthesizing';
  createdAt: string;
  updatedAt: string;
  tasksTotal: number;
  tasksCompleted: number;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Delete Workspace Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteCheck, setConfirmDeleteCheck] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Research File Form
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [fileNameInput, setFileNameInput] = useState('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    loadWorkspaceData();
  }, [workspaceId]);

  async function loadWorkspaceData() {
    try {
      const [wsRes, jobsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}`),
        fetch(`/api/workspaces/${workspaceId}/jobs`)
      ]);

      if (!wsRes.ok) throw new Error('Workspace not found.');
      const wsData = await wsRes.json();
      const jobsData = await jobsRes.json();

      setWorkspace(wsData);
      setJobs(jobsData || []);
      setEditName(wsData.name);
      setEditDesc(wsData.description || '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWorkspaceHeader() {
    if (!editName.trim() || !workspace) return;

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() })
      });

      if (res.ok) {
        const updated = await res.json();
        setWorkspace(updated);
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Error renaming workspace:', e);
    }
  }

  async function handleDeleteWorkspace() {
    if (!workspace || !confirmDeleteCheck || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}?confirm=true`, {
        method: 'DELETE'
      });

      if (res.ok) {
        router.push('/workspaces');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete workspace.');
      }
    } catch (e) {
      console.error('Error deleting workspace:', e);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteJob(e: React.MouseEvent, jobId: string) {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this research file?')) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(jobs.filter(j => j.id !== jobId));
        if (workspace) {
          setWorkspace({ ...workspace, fileCount: Math.max(0, workspace.fileCount - 1) });
        }
      }
    } catch (e) {
      console.error('Error deleting job:', e);
    }
  }

  async function handleCreateResearchFile(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !workspace || isSubmittingFile) return;

    setIsSubmittingFile(true);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          fileName: fileNameInput.trim() || question.trim(),
          depth,
          workspaceId: workspace.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dispatch research swarm.');
      }

      const data = await res.json();
      router.push(`/jobs/${data.job_id}`);
    } catch (err) {
      alert((err as Error).message);
      setIsSubmittingFile(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-color)] border-t-transparent animate-spin"></div>
        <p className="text-xs text-[var(--text-secondary)]">Loading workspace details...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-2xl mx-auto p-8 claude-card rounded-2xl border border-red-900/50 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Workspace Not Found</h2>
        <p className="text-[var(--text-secondary)] text-sm">{error}</p>
        <Link href="/workspaces" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] text-xs border border-[var(--border-color)]">
          <ArrowLeft className="w-4 h-4" /> Return to Workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="claude-card p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/workspaces" className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-color)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Workspaces Overview
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-input)] transition-colors"
              title="Delete Workspace"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editable Workspace Name & Description */}
        {isEditing ? (
          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-base font-semibold text-[var(--text-primary)] outline-none"
            />
            <textarea
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveWorkspaceHeader}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] text-xs border border-[var(--border-color)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: workspace.color || '#d97745' }}></span>
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                  {workspace.name}
                </h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  title="Rename Workspace"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              {workspace.description && (
                <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                  {workspace.description}
                </p>
              )}
            </div>

            <span className="text-xs font-mono text-[var(--accent-color)] bg-[var(--bg-input)] px-3 py-1 rounded-full border border-[var(--border-color)] shrink-0">
              {workspace.fileCount} {workspace.fileCount === 1 ? 'Research File' : 'Research Files'}
            </span>
          </div>
        )}
      </div>

      {/* Scoped New Research File Button & Inline Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Research Files in Workspace</span>
          </h3>

          <button
            onClick={() => setShowNewFileForm(!showNewFileForm)}
            className="py-2 px-4 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Research File</span>
          </button>
        </div>

        {/* Inline New Research File Form */}
        {showNewFileForm && (
          <form onSubmit={handleCreateResearchFile} className="claude-card p-5 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Launch Research Swarm File in "{workspace.name}"
              </span>
              <button
                type="button"
                onClick={() => setShowNewFileForm(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Display File Name (Optional)
              </label>
              <input
                type="text"
                value={fileNameInput}
                onChange={(e) => setFileNameInput(e.target.value)}
                placeholder="e.g. Plant-based protein market report"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Research Question *
              </label>
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What broad topic would you like the swarm to research?"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${depth === 'quick' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)]'}`}
                >
                  Quick (4)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('standard')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${depth === 'standard' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)]'}`}
                >
                  Standard (6)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('deep')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${depth === 'deep' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)]'}`}
                >
                  Deep (8+)
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmittingFile || !question.trim()}
                className="py-2 px-5 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {isSubmittingFile ? 'Dispatching...' : 'Dispatch Swarm Run'}
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* List of Files (Jobs) in Workspace */}
        {jobs.length === 0 ? (
          <div className="claude-card p-8 rounded-2xl text-center space-y-3 border border-[var(--border-color)]">
            <FileText className="w-8 h-8 text-[var(--accent-color)] mx-auto opacity-70" />
            <p className="text-xs text-[var(--text-secondary)]">No research files in this workspace yet.</p>
            <button
              onClick={() => setShowNewFileForm(true)}
              className="py-2 px-4 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold"
            >
              Add First Research File
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const progress = job.tasksTotal > 0 ? Math.round((job.tasksCompleted / job.tasksTotal) * 100) : 0;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="claude-card p-4 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all block space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
                      <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                        {job.fileName || job.question}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {job.status === 'completed' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--accent-color)] border border-[var(--border-color)] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {job.status === 'in_progress' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent-color)]" /> Running ({progress}%)
                        </span>
                      )}
                      {job.status === 'planning' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                          Planning
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDeleteJob(e, job.id)}
                        className="p-1 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        title="Delete research file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1 pl-7">
                    Prompt: "{job.question}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pl-7 pt-1">
                    <span>Tasks: {job.tasksCompleted}/{job.tasksTotal}</span>
                    <span>Updated {new Date(job.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="claude-card w-full max-w-md p-6 rounded-2xl border border-red-900/50 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>Delete Workspace "{workspace.name}"?</span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This action will cascade-delete the workspace and all <strong className="text-[var(--text-primary)]">{workspace.fileCount} research files</strong> contained within it.
            </p>

            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 flex items-start gap-2 text-xs text-red-300">
              <input
                type="checkbox"
                id="confirm-delete-checkbox"
                checked={confirmDeleteCheck}
                onChange={(e) => setConfirmDeleteCheck(e.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <label htmlFor="confirm-delete-checkbox" className="cursor-pointer select-none">
                I understand this will permanently delete this workspace and all associated research reports.
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmDeleteCheck(false);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] text-xs border border-[var(--border-color)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={!confirmDeleteCheck || isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition-opacity"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace & Files'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
