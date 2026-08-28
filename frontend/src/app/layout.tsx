import './globals.css';
import React from 'react';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'Research Swarm | Autonomous Multi-Agent Research Engine',
  description: 'Asynchronous AI Agent Swarm powered by Google Cloud & Gemini',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="theme-terracotta bg-[#141312] text-[#f0ece1] min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
