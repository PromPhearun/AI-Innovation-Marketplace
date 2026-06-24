'use strict';

import React, { useState, useEffect, useRef } from 'react';
import { LoopStatus } from '@/lib/ai/agent-loop-runner';

interface AgentLoopPanelProps {
  ideaId: string;
  ideaTitle: string;
  ideaDescription: string;
}

export default function AgentLoopPanel({
  ideaId,
  ideaTitle,
  ideaDescription,
}: AgentLoopPanelProps) {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [selectedIde, setSelectedIde] = useState<'vscode' | 'cursor' | 'kiro'>('vscode');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Poll status from the API
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`);
      if (res.ok) {
        const data: LoopStatus = await res.json();
        setStatus(data);
        if (data.status === 'running') {
          setPollingActive(true);
        } else {
          setPollingActive(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agent loop status:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [ideaId]);

  // Polling hook
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (pollingActive) {
      intervalId = setInterval(() => {
        fetchStatus();
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingActive]);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [status?.logs]);

  // Trigger loop execution
  const handleStartLoop = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', ide: isRunBefore ? undefined : selectedIde }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setPollingActive(true);
      } else {
        alert('Failed to start agent loop. Check server logs.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger manual kill switch
  const handleStopLoop = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setPollingActive(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Download complete workspace
  const handleDownloadWorkspace = () => {
    window.location.href = `/api/ideas/${ideaId}/agent-loop/download`;
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Active Loop Running
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 rounded-full uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Specification Compiled
          </span>
        );
      case 'stopped':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Loop Terminated
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-full uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Execution Fault
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-slate-500 bg-slate-500/10 border border-slate-500/20 rounded-full uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Idle Specification
          </span>
        );
    }
  };

  const isRunBefore = status && (status.status === 'completed' || status.status === 'stopped' || status.status === 'failed' || status.iteration > 0);
  const buttonText = isRunBefore 
    ? 'Run Spec Engine for 5 More Cycles' 
    : 'Launch Spec Engine & Open IDE';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* MISSION CONTROL CENTER */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              AI Self-Prompting Loop Mission Control
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Triggers a cyclic Builder-Critic workflow that recursively structures file spec documents.
            </p>
          </div>
          <div>{status ? getStatusBadge(status.status) : getStatusBadge('idle')}</div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 font-mono">
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mr-1 text-[10px]">Target Idea:</span>
          <strong className="text-slate-800 dark:text-slate-200">{ideaTitle}</strong> — {ideaDescription.length > 150 ? `${ideaDescription.substring(0, 150)}...` : ideaDescription}
        </div>

        {/* CONTROLS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-inner">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">
                Target Local IDE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['vscode', 'cursor', 'kiro'] as const).map((ide) => (
                  <button
                    key={ide}
                    type="button"
                    onClick={() => setSelectedIde(ide)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all capitalize ${
                      selectedIde === ide
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {ide === 'vscode' ? 'VS Code' : ide === 'cursor' ? 'Cursor' : 'Kiro'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Launches selected IDE locally pointing directly to the compiled specifications workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-3">
            {status?.status === 'running' ? (
              <button
                type="button"
                onClick={handleStopLoop}
                disabled={isActionLoading}
                className="w-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                Stop Loop (Manual Kill Switch)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartLoop}
                disabled={isActionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {buttonText}
              </button>
            )}

            {status && status.filesCreated.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadWorkspace}
                className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border dark:border-slate-800 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Workspace Spec Archive (.zip)
              </button>
            )}
          </div>
        </div>

        {/* MANUAL TERMINAL TRIGGER INFO CARD */}
        {status && status.status !== 'idle' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200/90 shadow-sm animate-fade-in">
            <span className="text-base mt-0.5 select-none">💡</span>
            <div className="space-y-1">
              <strong className="font-extrabold uppercase tracking-wide text-[10px] text-amber-900 dark:text-amber-300">
                Tip: Run the loop locally anytime
              </strong>
              <p>
                If you prefer not to wait for another 5 cycles in the browser, or if your local workspace was blocked by IDE security settings, you can manually trigger code writing directly in your IDE:
              </p>
              <div className="bg-slate-900 text-slate-100 font-mono text-[11px] p-2.5 rounded-lg border border-slate-800 mt-2 select-all shadow-inner flex items-center justify-between">
                <span>node agent_loop.js</span>
                <span className="text-[9px] text-slate-500 font-sans tracking-wide uppercase select-none">Run in IDE terminal</span>
              </div>
            </div>
          </div>
        )}

        {/* PROGRESS METER */}
        {status?.status === 'running' && (
          <div className="space-y-2 animate-pulse">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              <span>Builder-Critic Consensus Cycle Progress</span>
              <span>Iteration {status.iteration} of {status.maxIterations}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(status.iteration / status.maxIterations) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* TERMINAL LOGS & FILES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TERMINAL CONSOLE */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 rounded-2xl border border-slate-900 shadow-2xl overflow-hidden flex flex-col h-[400px]">
            {/* Terminal Header */}
            <div className="bg-slate-900 border-b border-slate-900/60 py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] text-slate-500 font-mono font-bold pl-2">spec-agent-daemon@deriv</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">zsh - Live TTY Buffer</span>
            </div>

            {/* Terminal Logs */}
            <div 
              ref={terminalContainerRef}
              className="p-4 flex-1 overflow-y-auto font-mono text-xs text-emerald-400/95 space-y-2 leading-relaxed selection:bg-emerald-500/20"
            >
              {status?.logs && status.logs.length > 0 ? (
                status.logs.map((log, index) => {
                  let colorClass = 'text-emerald-400/90';
                  if (log.includes('🛑') || log.includes('stopped')) colorClass = 'text-rose-400';
                  if (log.includes('✅') || log.includes('APPROVED')) colorClass = 'text-indigo-400 font-black';
                  if (log.includes('🤖 Persona A')) colorClass = 'text-amber-400/90';
                  if (log.includes('🕵️ Persona B')) colorClass = 'text-violet-400/90';
                  if (log.includes('⚠️')) colorClass = 'text-amber-500';

                  return (
                    <div key={index} className={colorClass}>
                      <span className="text-slate-600 mr-2">$</span>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-600 italic">TTY input buffer empty. Awaiting loop trigger sequence...</div>
              )}
            </div>
          </div>
        </div>

        {/* WORKSPACE FILES */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm h-[400px] flex flex-col">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Workspace Spec Artifacts
            </h4>
            <p className="text-[10px] text-slate-500">
              Spec documents created recursively within <code>./agent_workspace/idea_{ideaId}/</code>.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {status && status.filesCreated.length > 0 ? (
              status.filesCreated.map((filename) => (
                <div
                  key={filename}
                  className="bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-500/5 hover:border-indigo-500/20 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px] md:max-w-[160px]">
                        {filename}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Markdown Document
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-8 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <svg className="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-[10px] text-slate-500">No specs compiled. Ready to run agent loop.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AUDIT & SELF-PROMPTING HISTORY */}
      {status?.history && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Self-Consensus Audit History
            </h3>
            <p className="text-xs text-slate-500">
              Audit trails documenting criticisms, modifications, and security reviews recorded in <code>prompthistory.md</code>.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 max-h-[350px] overflow-y-auto leading-relaxed shadow-inner">
            <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap selection:bg-indigo-500/20">
              {status.history}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
