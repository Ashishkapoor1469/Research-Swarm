'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Zap, Layers, Cpu, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

const PRESET_QUESTIONS = [
  "How is the EU AI Act going to affect small AI startups?",
  "What are the primary technical hurdles and market forecasts for AI Agent Swarms in 2026?",
  "How will autonomous agent swarms transform venture capital due diligence?"
];

export default function HomePage() {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), depth })
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
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ALL THINGS AGENTIC HACKATHON PROTOTYPE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Dispatch an Autonomous <br />
          <span className="text-gradient">Multi-Agent Research Swarm</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Submit a broad question. Our Coordinator breaks it into sub-queries, spawns parallel Worker Agents to search & scrape the web, and incrementally synthesizes a cited living report.
        </p>
      </div>

      {/* Main Intake Form */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label htmlFor="question-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Research Question or Complex Topic
            </label>
            <textarea
              id="question-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How is the EU AI Act going to affect small AI startups?"
              className="w-full bg-gray-950/90 border border-gray-800 rounded-xl p-4 text-white text-base focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
              required
            />
          </div>

          {/* Depth Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Swarm Depth & Worker Allocation
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDepth('quick')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  depth === 'quick'
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Zap className="w-4 h-4 text-amber-400" /> Quick
                </div>
                <div className="text-xs text-gray-500 mt-1">4 Parallel Workers</div>
              </button>

              <button
                type="button"
                onClick={() => setDepth('standard')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  depth === 'standard'
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Layers className="w-4 h-4 text-cyan-400" /> Standard
                </div>
                <div className="text-xs text-gray-500 mt-1">6 Workers + Re-planner</div>
              </button>

              <button
                type="button"
                onClick={() => setDepth('deep')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  depth === 'deep'
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                    : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Cpu className="w-4 h-4 text-purple-400" /> Deep Swarm
                </div>
                <div className="text-xs text-gray-500 mt-1">8+ Workers + Dynamic Synthesis</div>
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <span className="text-xs text-gray-500">Try a sample broad question:</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-800 transition-colors text-left"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !question.trim()}
            className="w-full py-4 px-6 rounded-xl glow-gradient font-bold text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Deploying Research Swarm...</span>
              </>
            ) : (
              <>
                <span>Launch Async Research Swarm</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Runs asynchronously in background</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Grounded with Google Search</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="glass-card p-5 rounded-xl border border-gray-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 font-bold">
            1
          </div>
          <h3 className="font-semibold text-white text-base">Walk-Away UX</h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            POST /jobs creates a job record in Firestore and returns immediately. You can close your tab or leave the browser.
          </p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-gray-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 font-bold">
            2
          </div>
          <h3 className="font-semibold text-white text-base">Parallel Fan-Out Fleet</h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            Coordinator decomposes your query into parallel Worker Agents with exponential backoff retries & search tools.
          </p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-gray-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 font-bold">
            3
          </div>
          <h3 className="font-semibold text-white text-base">Living Markdown Synthesis</h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            Synthesizer continuously updates themed sections, inline source links, and re-plans as new findings arrive.
          </p>
        </div>
      </div>
    </div>
  );
}
