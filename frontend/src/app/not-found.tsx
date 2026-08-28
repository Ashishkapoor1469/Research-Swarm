import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Page Not Found</h2>
      <p className="text-[var(--text-secondary)] text-sm">The requested research task or page does not exist.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs hover:border-[var(--accent-color)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Research Swarm
      </Link>
    </div>
  );
}
