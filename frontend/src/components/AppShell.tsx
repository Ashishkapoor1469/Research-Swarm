'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Folder, FileText, Code2, Sliders, Pin, 
  PanelLeft, ChevronDown, ChevronRight, Palette, FolderPlus, Sparkles
} from 'lucide-react';

export type ModelOption = 'gemini-2.5-flash' | 'gemini-2.0-pro' | 'gemini-1.5-pro' | 'claude-3.5-sonnet';
export type ThemeOption = 'theme-terracotta' | 'theme-cyan' | 'theme-purple' | 'theme-emerald';

interface Workspace {
  id: string;
  name: string;
  color?: string;
  fileCount: number;
}

interface ResearchJob {
  id: string;
  workspaceId: string;
  fileName?: string;
  question: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('theme-terracotta');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [recentJobs, setRecentJobs] = useState<ResearchJob[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.body.className = selectedTheme;
  }, [selectedTheme]);

  useEffect(() => {
    async function loadData() {
      try {
        const [wsRes, jobsRes] = await Promise.all([
          fetch('/api/workspaces'),
          fetch('/api/jobs')
        ]);
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspaces(wsData || []);
          // Expand first workspace by default
          if (wsData && wsData.length > 0) {
            setExpandedWorkspaces({ [wsData[0].id]: true });
          }
        }
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setRecentJobs(jobsData || []);
        }
      } catch (e) {
        console.error('Error loading sidebar data:', e);
      }
    }
    loadData();
  }, []);

  const toggleWorkspaceExpand = (id: string) => {
    setExpandedWorkspaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const themeLabels: Record<ThemeOption, { name: string; color: string }> = {
    'theme-terracotta': { name: 'Amber Terracotta', color: '#d97745' },
    'theme-cyan': { name: 'Cyber Cyan', color: '#06b6d4' },
    'theme-purple': { name: 'Vertex Purple', color: '#a855f7' },
    'theme-emerald': { name: 'Emerald Forest', color: '#10b981' }
  };

  return (
    <div className="flex min-h-screen w-full font-sans overflow-x-hidden">
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity" 
        />
      )}

      {/* Left Sidebar (Responsive Overlay Drawer on Mobile, Relative Panel on Desktop) */}
      <aside
        className={`${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0'
        } fixed md:relative inset-y-0 left-0 transition-all duration-300 ease-in-out border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col justify-between shrink-0 z-50 overflow-hidden shadow-2xl md:shadow-none`}
      >
        <div className="p-3 space-y-4">
          {/* Logo */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-[var(--text-primary)]">
                Research Swarm
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>

          {/* + New Swarm Button */}
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium text-xs flex items-center gap-2.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-[var(--accent-color)]" />
            <span>New Research Swarm</span>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-0.5 text-xs text-[var(--text-secondary)]">
            <Link 
              href="/workspaces" 
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-medium transition-colors"
            >
              <div className="flex items-center gap-3">
                <Folder className="w-4 h-4 text-[var(--accent-color)]" />
                <span>Workspaces</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--accent-color)] font-mono font-bold">
                {workspaces.length}
              </span>
            </Link>

            <a href="#" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors">
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4" />
                <span>Swarm Code & API</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border-color)] text-[var(--accent-color)] font-mono">PRO</span>
            </a>
          </nav>

          {/* Workspaces Tree Navigation (Workspace -> Files) */}
          <div className="pt-2 border-t border-[var(--border-color)]/60 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Workspace Tree</span>
              <Link href="/workspaces" onClick={() => setSidebarOpen(false)} title="New Workspace">
                <FolderPlus className="w-3.5 h-3.5 cursor-pointer hover:text-[var(--text-primary)] text-[var(--accent-color)]" />
              </Link>
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {workspaces.map((ws) => {
                const isExpanded = !!expandedWorkspaces[ws.id];
                const wsJobs = recentJobs.filter(j => j.workspaceId === ws.id);

                return (
                  <div key={ws.id} className="space-y-0.5">
                    {/* Workspace Header Row */}
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-card)] text-xs text-[var(--text-primary)] transition-colors group">
                      <button
                        onClick={() => toggleWorkspaceExpand(ws.id)}
                        className="flex items-center gap-2 truncate flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
                        )}
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ws.color || '#d97745' }}></span>
                        <span className="truncate font-medium">{ws.name}</span>
                      </button>

                      <Link
                        href={`/workspaces/${ws.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] font-mono"
                      >
                        ({ws.fileCount})
                      </Link>
                    </div>

                    {/* Files inside Workspace */}
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5">
                        {wsJobs.length === 0 ? (
                          <span className="block px-2 py-1 text-[11px] text-[var(--text-secondary)]/60 italic">
                            No files yet
                          </span>
                        ) : (
                          wsJobs.slice(0, 5).map((job) => (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              onClick={() => setSidebarOpen(false)}
                              className="block px-2 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] truncate transition-colors"
                            >
                              📄 {job.fileName || job.question}
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center font-bold text-xs">
              AK
            </div>
            <span className="font-medium text-[var(--text-primary)]">Ashish · Pro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-[var(--bg-card)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Collapse Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-14 px-3 sm:px-4 border-b border-[var(--border-color)]/50 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-[var(--bg-main)]/80">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Toggle Navigation Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
              Research Swarm
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Color Palette Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] hover:border-[var(--accent-color)] transition-colors cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" style={{ color: themeLabels[selectedTheme].color }} />
                <span>{themeLabels[selectedTheme].name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">
                    Color Theme Palette
                  </div>
                  {Object.entries(themeLabels).map(([key, item]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedTheme(key as ThemeOption);
                        setShowThemeDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-xs flex items-center gap-2 text-left hover:bg-[var(--bg-input)] text-[var(--text-primary)] transition-colors"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-[var(--border-color)]">
              <span>Pro Plan</span>
              <span className="text-[var(--accent-color)] font-semibold cursor-pointer">Active</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 w-full mx-auto px-4 py-4 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
