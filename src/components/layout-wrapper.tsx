'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { useUser } from '@/context/user-context';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 font-medium text-sm animate-pulse">Initializing Innovation Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-900 text-slate-100 min-h-screen">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Enterprise Innovation Engine</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400">LiteLLM Activated</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-400 font-medium">Local Mock Fallback Online</span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
