'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Folder, FileText, Code2, Sliders, Pin, 
  PanelLeft, ChevronDown, Palette
} from 'lucide-react';

export type ModelOption = 'gemini-2.5-flash' | 'gemini-2.0-pro' | 'gemini-1.5-pro' | 'claude-3.5-sonnet';
export type ThemeOption = 'theme-terracotta' | 'theme-cyan' | 'theme-purple' | 'theme-emerald';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('theme-terracotta');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [recentJobs, setRecentJobs] = useState<Array<{ id: string; question: string }>>([]);

  useEffect(() => {
    document.body.className = selectedTheme;
  }, [selectedTheme]);

  useEffect(() => {
    async function loadRecentJobs() {
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setRecentJobs(data.slice(0, 8).map((j: any) => ({ id: j.id, question: j.question })));
          }
        }
      } catch (e) {
        setRecentJobs([
          { id: 'job-1', question: 'How is the EU AI Act going to affect small AI startups?' },
          { id: 'job-2', question: 'Technical hurdles & market forecast for AI Swarms 2026' },
          { id: 'job-3', question: 'Venture Capital due diligence automation via agents' }
        ]);
      }
    }
    loadRecentJobs();
  }, []);

  const themeLabels: Record<ThemeOption, { name: string; color: string }> = {
    'theme-terracotta': { name: 'Amber Terracotta', color: '#d97745' },
    'theme-cyan': { name: 'Cyber Cyan', color: '#06b6d4' },
    'theme-purple': { name: 'Vertex Purple', color: '#a855f7' },
    'theme-emerald': { name: 'Emerald Forest', color: '#10b981' }
  };

  return (
    <div className="flex min-h-screen w-full font-sans">
      {/* Left Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'
        } transition-all duration-300 ease-in-out border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col justify-between shrink-0 relative z-30 overflow-hidden`}
      >
        <div className="p-3 space-y-4">
          {/* Logo */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight text-[var(--text-primary)]">
                Research Swarm
              </span>
            </Link>
          </div>

          {/* + New Swarm Button */}
          <Link
            href="/"
            className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium text-xs flex items-center gap-2.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-[var(--accent-color)]" />
            <span>New Research Swarm</span>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-0.5 text-xs text-[var(--text-secondary)]">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-medium transition-colors">
              <Folder className="w-4 h-4" />
              <span>Projects</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors">
              <FileText className="w-4 h-4" />
              <span>Living Reports & Artifacts</span>
            </a>
            <a href="#" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors">
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4" />
                <span>Swarm Code & API</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border-color)] text-[var(--accent-color)] font-mono">PRO</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors">
              <Sliders className="w-4 h-4" />
              <span>Customize Fleet</span>
            </a>
          </nav>

          {/* Pinned Projects */}
          <div className="pt-2 border-t border-[var(--border-color)]/60">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Pinned Workspace</span>
              <Plus className="w-3.5 h-3.5 cursor-pointer hover:text-[var(--text-primary)]" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] italic">
              <Pin className="w-3.5 h-3.5" />
              <span>Pin tasks to keep them here</span>
            </div>
          </div>

          {/* History */}
          <div className="pt-2 border-t border-[var(--border-color)]/60 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Recent Research Tasks</span>
            </div>
            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {recentJobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="block px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] truncate transition-colors"
                >
                  • {j.question}
                </Link>
              ))}
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
        {/* Top Navigation */}
        <header className="h-14 px-4 border-b border-[var(--border-color)]/50 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-[var(--bg-main)]/80">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Expand Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <span className="font-semibold text-sm text-[var(--text-primary)]">
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
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
          {children}
        </main>
      </div>
    </div>
  );
}
