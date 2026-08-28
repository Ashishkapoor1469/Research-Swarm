'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, ChevronDown, Sparkles, ArrowUp, Mic, Globe, Cpu, Zap, Layers, ShieldCheck 
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

export default function HomePage() {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [selectedModel, setSelectedModel] = useState<ModelOptionInfo>(MODEL_OPTIONS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
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
        body: JSON.stringify({ question: question.trim(), depth, model: selectedModel.id })
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
    <div className="w-full max-w-3xl mx-auto space-y-8 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Terracotta Sunburst Logo Emblem + Serif Greeting Header (Claude Style) */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          {/* Terracotta Sunburst Asterisk Emblem */}
          <span className="text-4xl sm:text-5xl text-[var(--accent-color)] select-none">
            ✳
          </span>
          <h1 className="font-serif-claude text-4xl sm:text-5xl text-[var(--text-primary)] tracking-tight">
            Coffee and Research Swarm time?
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm sm:text-base font-normal">
          Autonomous Multi-Agent Engine powered by Google Cloud & Gemini
        </p>
      </div>

      {/* Main Central Input Card Container (Claude Style) */}
      <div className="w-full">
        <form
          onSubmit={handleSubmit}
          className="w-full claude-card rounded-2xl p-4 space-y-4 shadow-2xl relative border border-[var(--border-color)]"
        >
          {/* Text Input Area */}
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How can I help you research today?"
            className="w-full bg-transparent text-[var(--text-primary)] text-base outline-none resize-none placeholder:text-[var(--text-secondary)]/60 font-normal leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {/* Bottom Controls Bar inside Input Card */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/50">
            {/* Left Side: + Action button & Mode/Depth Pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
                title="Add context or files"
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

            {/* Right Side: Model Selector Dropdown & Submit Arrow */}
            <div className="flex items-center gap-3">
              {/* Interactive Model Selector Dropdown */}
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

              {/* Mic Icon */}
              <button
                type="button"
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Submit Button (Claude Style Arrow) */}
              <button
                type="submit"
                disabled={isSubmitting || !question.trim()}
                className={`p-2 rounded-xl text-white transition-all cursor-pointer ${
                  question.trim()
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

      {/* Preset Questions List (Claude Style) */}
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
    </div>
  );
}
