import './globals.css';
import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Research Swarm | Autonomous Multi-Agent Research Engine',
  description: 'Asynchronous AI Agent Swarm powered by Google Cloud & Gemini 2.5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#080c14] text-gray-100 min-h-screen flex flex-col selection:bg-cyan-500 selection:text-black">
        {/* Navigation Header */}
        <header className="border-b border-gray-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl glow-gradient flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-gradient">Research Swarm</span>
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  Google Cloud + Gemini
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded-full border border-gray-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Swarm Engine Active</span>
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Docs & Architecture
              </a>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800/60 py-6 text-center text-xs text-gray-500">
          <p>Built for All Things Agentic Hackathon — Powered by Gemini 2.5 Flash, Cloud Run Jobs, Pub/Sub & Firestore</p>
        </footer>
      </body>
    </html>
  );
}
