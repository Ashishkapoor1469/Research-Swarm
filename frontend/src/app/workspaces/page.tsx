'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Folder, Plus, FileText, Clock, Trash2, Edit3, ArrowRight, X, Sparkles, FolderPlus 
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

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#d97745');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function fetchWorkspaces() {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data || []);
      }
    } catch (e) {
      console.error('Error fetching workspaces:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          color: newColor
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create workspace.');
      }

      const created = await res.json();
      setWorkspaces([created, ...workspaces]);
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
            Research Workspaces
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Organize related research swarm runs, living reports, and topic collections.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2 px-4 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspace Grid */}
      {loading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-color)] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-[var(--text-secondary)]">Loading workspaces...</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="claude-card p-8 rounded-2xl text-center space-y-4 border border-[var(--border-color)]">
          <Folder className="w-12 h-12 text-[var(--accent-color)] mx-auto opacity-80" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No Workspaces Found</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Create your first research workspace (e.g. "Food Research", "Quantum Security", "AI Regulation") to start organizing research files.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-5 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="claude-card p-5 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all group space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: ws.color || '#d97745' }}
                  ></span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-color)]">
                    {ws.fileCount} {ws.fileCount === 1 ? 'file' : 'files'}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
                  {ws.name}
                </h3>

                {ws.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {ws.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  <span>Updated {new Date(ws.updatedAt).toLocaleDateString()}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="claude-card w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[var(--accent-color)]" />
                <span>Create New Workspace</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Food Research, Quantum Security"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief summary of research topics in this workspace..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {['#d97745', '#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs border border-[var(--border-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newName.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-color)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
