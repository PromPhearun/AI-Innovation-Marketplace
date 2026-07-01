'use strict';

import React, { useState, useEffect, useRef } from 'react';
import { LoopStatus } from '@/lib/ai/agent-loop-runner';

// Convert the ISO-8601 timestamp embedded in a log line (server-side) into the
// viewer's local computer time. Falls back to the raw string for legacy log
// lines that were stamped with a server-local/UTC time string.
function formatLogTimestamp(log: string): { time: string | null; body: string } {
  const match = log.match(
    /^\[([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z)\]\s([\s\S]*)$/
  );
  if (match) {
    try {
      // toLocaleTimeString() uses the browser's local timezone = the user's computer time
      const local = new Date(match[1]).toLocaleTimeString();
      return { time: local, body: match[2] };
    } catch {
      return { time: null, body: log };
    }
  }
  return { time: null, body: log };
}


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

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string>('');
  const [isViewingLoading, setIsViewingLoading] = useState(false);
  const [showIdeGuideModal, setShowIdeGuideModal] = useState(false);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);
  const [showFirebaseWarning, setShowFirebaseWarning] = useState(false);

  // Poll status from the API
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`);
      if (res.ok) {
        const data: LoopStatus = await res.json();
        setStatus(data);
      // Bug fix: Do NOT re-enable polling when we've already hit maxIterations,
      // even if the backend still reports status='running' (can happen on a cold
      // Vercel instance that hasn't yet received the 'completed' write from the
      // last runAgentLoopIteration call). Without this guard the panel would
      // keep triggering new iterate requests beyond the intended iteration cap.
      if (data.status === 'running' && (data.iteration ?? 0) < (data.maxIterations ?? 5)) {
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

  // Auto-trigger next iteration when running and more iterations remain
  useEffect(() => {
    if (!status || status.status !== 'running') return;
    if (status.iteration >= status.maxIterations) {
      setPollingActive(false);
      return;
    }
    if (pollingActive && !isActionLoading) {
      const timer = setTimeout(async () => {
        // Guard: if status was updated to stopped/completed while we were waiting,
        // abort the timer before firing an unnecessary iterate call.
        if (!status || status.status !== 'running') {
          setPollingActive(false);
          return;
        }
        try {
          setIsActionLoading(true);
          const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'iterate' }),
            // Use a 295s client timeout — just under Vercel's 300s maxDuration —
            // so we always get a controlled response rather than a silent browser abort
            signal: AbortSignal.timeout(295_000),
          });
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
            if (data.status.status === 'running' && data.status.iteration < data.status.maxIterations) {
              // Keep polling - next iteration will auto-fire
            } else {
              setPollingActive(false);
            }
          } else {
            // Non-2xx response (e.g. Vercel 504 gateway timeout): the iteration
            // may have started but we lost the response. Re-fetch status so we
            // can see what actually happened before deciding to stop.
            console.warn('Auto-iteration got non-ok response, re-fetching status…', res.status);
            try {
              const statusRes = await fetch(`/api/ideas/${ideaId}/agent-loop`);
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                setStatus(statusData);
                // If the server still thinks it's running, keep looping
                if (statusData.status === 'running' && statusData.iteration < statusData.maxIterations) {
                  return; // pollingActive stays true, next tick will retry
                }
              }
            } catch {
              // status fetch also failed — network is down, stop cleanly
            }
            setPollingActive(false);
          }
        } catch (err) {
          // Network error or AbortError (client-side timeout): re-fetch status
          // before giving up so a brief connectivity blip doesn't kill the loop
          console.error('Auto-iteration fetch failed:', err);
          try {
            const statusRes = await fetch(`/api/ideas/${ideaId}/agent-loop`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setStatus(statusData);
              if (statusData.status === 'running' && statusData.iteration < statusData.maxIterations) {
                return; // keep the loop alive
              }
            }
          } catch {
            // ignore secondary failure
          }
          setPollingActive(false);
        } finally {
          setIsActionLoading(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status?.iteration, pollingActive, isActionLoading, ideaId]);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [status?.logs]);

  // Auto-download workspace when consensus is reached — uses fetch+blob so the
  // browser doesn't navigate away from the React app (which caused a white screen).
  useEffect(() => {
    if (!status?.consensusReached || autoDownloadTriggered) return;
    const isCloudEnv = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    if (isCloudEnv && status.filesCreated.length > 0) {
      setAutoDownloadTriggered(true);
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/ideas/${ideaId}/agent-loop/download`);
          if (!res.ok) {
            console.warn('Auto-download failed with status', res.status);
            return;
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `idea_${ideaId}_workspace.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn('Auto-download error:', err);
        }
      }, 800);
    }
  }, [status?.consensusReached, autoDownloadTriggered, ideaId, status?.filesCreated]);

  // Check Firebase configuration on mount for cloud environments
  useEffect(() => {
    const isCloudEnv = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    const isFirebaseOn = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
    if (isCloudEnv && !isFirebaseOn) {
      setShowFirebaseWarning(true);
    }
  }, []);

  // Ref to track whether an iterate call is currently in-flight so the
  // auto-iteration effect never fires two concurrent requests.
  const iterateInFlightRef = useRef(false);

  // Run one iterate cycle and schedule the next if still running.
  // This is called both by handleStartLoop (first iteration after start)
  // and by the auto-iteration useEffect for subsequent cycles.
  const runNextIteration = React.useCallback(async () => {
    if (iterateInFlightRef.current) return;
    iterateInFlightRef.current = true;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'iterate' }),
        signal: AbortSignal.timeout(295_000),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.status.status === 'running' && data.status.iteration < data.status.maxIterations) {
          setPollingActive(true);
        } else {
          setPollingActive(false);
        }
      } else {
        console.warn('iterate got non-ok response, re-fetching status…', res.status);
        try {
          const statusRes = await fetch(`/api/ideas/${ideaId}/agent-loop`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setStatus(statusData);
            if (statusData.status === 'running' && statusData.iteration < statusData.maxIterations) {
              setPollingActive(true);
            } else {
              setPollingActive(false);
            }
          }
        } catch {
          setPollingActive(false);
        }
      }
    } catch (err) {
      console.error('iterate fetch failed:', err);
      try {
        const statusRes = await fetch(`/api/ideas/${ideaId}/agent-loop`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
          if (statusData.status === 'running' && statusData.iteration < statusData.maxIterations) {
            setPollingActive(true);
            return;
          }
        }
      } catch {
        // ignore secondary failure
      }
      setPollingActive(false);
    } finally {
      iterateInFlightRef.current = false;
      setIsActionLoading(false);
    }
  }, [ideaId]);

  // Trigger loop execution
  const handleStartLoop = async () => {
    // Immediately stop any running polling / in-flight iterate from previous run
    setPollingActive(false);
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          ide: isRunBefore ? undefined : selectedIde,
          resume: isRunBefore,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);

        const isCloudEnv = typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';

        if (data.status.status === 'running' && data.status.iteration < data.status.maxIterations) {
          // Directly kick off the next iteration now — no reliance on the
          // effect timer so the loop starts reliably on the very first click.
          setPollingActive(true);
          // Small delay to allow React to flush the state update before the next call
          setTimeout(() => { runNextIteration(); }, 500);
        } else {
          setPollingActive(false);
          if (isCloudEnv && !isRunBefore && data.status.status === 'completed') {
            setShowIdeGuideModal(true);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to start agent loop. Check server logs.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger manual kill switch — optimistic UI: mark stopped immediately
  const handleStopLoop = async () => {
    // Optimistically stop the UI loop right away so the button responds on first click
    setPollingActive(false);
    setStatus(prev => prev ? { ...prev, status: 'stopped' } : prev);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger IDE launch
  const handleLaunchIDE = async () => {
    const isCloudEnv = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (isCloudEnv) {
      setShowIdeGuideModal(true);
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'launch_ide',
          ide: selectedIde,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      } else {
        alert('Failed to launch local IDE.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Download complete workspace — fetch+blob keeps the user on the page
  const handleDownloadWorkspace = async () => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop/download`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Download failed. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idea_${ideaId}_workspace.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Check your connection and try again.');
    }
  };

  // Save workspace files to local folder via File System Access API, then open IDE
  const [isSavingToLocal, setIsSavingToLocal] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleSaveToLocalAndOpen = async () => {
    // Check browser support
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      alert(
        'Your browser does not support direct folder access. ' +
        'Please use Chrome, Edge, or Brave, or download the ZIP archive instead.'
      );
      return;
    }

    setIsSavingToLocal(true);
    setSaveSuccessMessage(null);

    try {
      // 1. Pick a local folder
      const dirHandle = await (window as unknown as {
        showDirectoryPicker: (options?: {
          id?: string;
          mode?: 'read' | 'readwrite';
          startIn?: string;
        }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop',
      });

      // 2. Fetch all workspace files from API
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop/files`);
      if (!res.ok) {
        throw new Error('Failed to fetch workspace files');
      }
      const { files } = await res.json() as { files: Record<string, string> };

      // 3. Write each file to the chosen directory
      const fileNames = Object.keys(files);
      for (const filename of fileNames) {
        const content = files[filename];
        // Create subdirectories as needed
        const parts = filename.split('/');
        let currentDir: FileSystemDirectoryHandle = dirHandle;

        for (let i = 0; i < parts.length - 1; i++) {
          const dirName = parts[i];
          if (!dirName) continue;
          currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
        }

        const fileName = parts[parts.length - 1];
        if (fileName) {
          const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
        }
      }

      setSaveSuccessMessage(
        `✓ Saved ${fileNames.length} files! Open your ${selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'} and open the folder you selected.`
      );

      // 4. Attempt protocol link (works if user saved to default ~/Desktop/agent_workspace/)
      const defaultPath = `~/Desktop/agent_workspace/${displayFolderName}`;
      window.open(
        `${selectedIde}://file/${encodeURIComponent(defaultPath)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.error('Save to local failed:', error);
        alert(`Failed to save files: ${error.message}`);
      }
    } finally {
      setIsSavingToLocal(false);
    }
  };

  const handleViewFile = async (filename: string) => {
    setViewingFile(filename);
    setViewingContent('');
    setIsViewingLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/agent-loop?file=${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        setViewingContent(data.content || '');
      } else {
        setViewingContent('Error: Failed to load file contents.');
      }
    } catch (err) {
      console.error(err);
      setViewingContent('Error: Network connection failed.');
    } finally {
      setIsViewingLoading(false);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    if (status?.consensusReached) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase tracking-wider animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Consensus Reached 🎉
        </span>
      );
    }
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

  const isRunBefore = status && (status.status === 'completed' || status.status === 'stopped' || (status.iteration > 0 && status.status !== 'failed'));
  const buttonText = isRunBefore 
    ? 'Run Spec Engine for 5 More Cycles' 
    : 'Launch Spec Engine & Open IDE';

  const displayFolderName = ideaId.startsWith('idea_') ? ideaId : `idea_${ideaId}`;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* FIREBASE NOT CONFIGURED WARNING */}
      {showFirebaseWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 p-4 rounded-xl flex items-start gap-3 text-xs shadow-sm animate-fade-in">
          <span className="text-lg mt-0.5 shrink-0">⚠️</span>
          <div className="space-y-1.5 text-amber-800 dark:text-amber-300 min-w-0">
            <strong className="font-extrabold uppercase tracking-wide text-[11px] block">
              Firebase Storage Not Configured — Ephemeral Workspace
            </strong>
            <p>
              This app is running on a cloud server without persistent storage. All generated workspace files will be <strong className="text-amber-900 dark:text-amber-200">lost</strong> when the server restarts or the instance recycles. 
              Download your workspace immediately after consensus is reached.
            </p>
            <p className="text-amber-600/80 dark:text-amber-400/80">
              To enable persistent storage, set <code className="bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded text-[10px]">NEXT_PUBLIC_USE_FIREBASE=true</code> and configure Firebase environment variables in Vercel.
            </p>
          </div>
        </div>
      )}

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
                className="w-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                Stop Loop (Manual Kill Switch)
              </button>
            ) : status?.consensusReached ? (
              <div className="flex flex-col gap-2.5 animate-fade-in">
                <button
                  type="button"
                  onClick={handleLaunchIDE}
                  disabled={isActionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Open Workspace in {selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'}
                </button>

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
                  Run Agent Code Builder (5 Cycles)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartLoop}
                disabled={isActionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
                disabled={!status?.consensusReached}
                className={`w-full font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                  !status?.consensusReached
                    ? 'bg-slate-200 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 border border-slate-100 dark:border-slate-800/40'
                    : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border dark:border-slate-800 text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Workspace Spec Archive (.zip)
              </button>
            )}

            {/* Save & Open in IDE — File System Access API (cloud & local) */}
            {status?.consensusReached && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSaveToLocalAndOpen}
                  disabled={isSavingToLocal}
                  className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:bg-violet-400 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSavingToLocal ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving files...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save & Open in {selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'}
                    </>
                  )}
                </button>

                {saveSuccessMessage && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed animate-fade-in">
                    {saveSuccessMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DYNAMIC TIP / INTEGRATION CARD */}
        {status && status.status !== 'idle' && (
          status.consensusReached ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-200/90 shadow-sm animate-fade-in">
              <span className="text-base mt-0.5 select-none">🎉</span>
              <div className="space-y-1">
                <strong className="font-extrabold uppercase tracking-wide text-[10px] text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  Cline Integration Ready (Recommended)
                </strong>
                <p>
                  Specifications have been officially <strong>APPROVED</strong>! A custom <code>.clinerules</code> file has been generated in your workspace. Simply open this workspace in {selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'}, launch Cline, and say:
                </p>
                <div className="bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-lg border border-slate-800 mt-2 shadow-inner leading-relaxed">
                  <span className="text-emerald-400">{'"Build this project based on the approved specifications and .clinerules"'}</span>
                </div>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  Cline will automatically read the approved architecture, requirements, and goal documents to write complete, error-free code hands-free!
                </p>
              </div>
            </div>
          ) : (
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
          )
        )}

        {/* EXECUTION FAULT — EXACT ERROR DISPLAY */}
        {status?.status === 'failed' && status?.error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-700/60 p-4 rounded-xl flex items-start gap-3 text-xs shadow-sm animate-fade-in">
            <span className="text-lg mt-0.5 shrink-0">❌</span>
            <div className="space-y-1.5 text-rose-800 dark:text-rose-300 min-w-0 flex-1">
              <strong className="font-extrabold uppercase tracking-wide text-[11px] block">
                Execution Fault — Exact Error
              </strong>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] bg-rose-100/60 dark:bg-rose-900/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800/50 leading-relaxed">
                {status.error}
              </pre>
              <p className="text-rose-600/80 dark:text-rose-400/80 text-[10px]">
                The loop halted because the AI call failed. Common causes: the LLM endpoint timed out / was unreachable,
                an invalid API key (401), or a WAF/proxy block (403). Review the full trace in the Live TTY Buffer below, then re-run.
              </p>
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
                  if (log.includes('❌')) colorClass = 'text-rose-400 font-bold';

                  const { time, body } = formatLogTimestamp(log);

                  return (
                    <div key={index} className={colorClass}>
                      <span className="text-slate-600 mr-2">$</span>
                      {time !== null ? (
                        <>
                          <span className="text-slate-500 mr-1.5">[{time}]</span>
                          {body}
                        </>
                      ) : (
                        log
                      )}
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
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm h-[400px] flex flex-col min-w-0">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Workspace Spec Artifacts
            </h4>
            <p className="text-[10px] text-slate-500 break-all leading-normal">
              Spec documents created recursively within <code className="break-all font-mono select-all bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">./agent_workspace/{displayFolderName}/</code>.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {status && status.filesCreated.length > 0 ? (
              // Security: exclude sensitive files from the viewable file list.
              // .env contains the API key and must never be displayed in the UI.
              status.filesCreated.filter((f) => {
                const base = f.split('/').pop() || f;
                return base !== '.env' && base !== '.env.local' && !base.startsWith('.env.');
              }).map((filename) => (
                <button
                  key={filename}
                  type="button"
                  onClick={() => handleViewFile(filename)}
                  className="w-full text-left bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-500/5 hover:border-indigo-500/20 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl flex items-center justify-between group transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {filename}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {filename.endsWith('.md') ? 'Markdown Spec' : filename.endsWith('.json') ? 'JSON Config' : filename.endsWith('.js') || filename.endsWith('.ts') ? 'Source Code' : 'Text Document'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      View
                    </span>
                  </div>
                </button>
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

      {/* FILE VIEWER MODAL */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono break-all pr-4">
                    {viewingFile}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Workspace Spec Artifact Viewer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/40 min-h-[300px]">
              {isViewingLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 animate-pulse font-medium">Fetching artifact content...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono pl-2">
                      {viewingFile.split('.').pop()?.toUpperCase() || 'TEXT'} Document
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(viewingContent);
                        alert('Copied to clipboard!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
                    >
                      <svg className="w-3.5 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy File Contents
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-900 shadow-inner p-5 overflow-x-auto">
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {viewingContent || <span className="text-slate-600 italic">This file is empty.</span>}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setViewingFile(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD ENVIRONMENT IDE GUIDE MODAL */}
      {showIdeGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Local IDE Launch Guidance
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Running in Cloud Environment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIdeGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300">
                <span className="text-sm mt-0.5">⚠️</span>
                <div>
                  <strong className="font-extrabold text-[11px] block uppercase tracking-wider mb-0.5">Browser Sandbox Security</strong>
                  This application is running in a secure, hosted cloud sandbox. Browsers do not permit websites to execute local shell commands or launch applications like {selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'} directly on your local computer for security reasons.
                </div>
              </div>

              {status?.consensusReached && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex gap-3 text-emerald-800 dark:text-emerald-300">
                  <span className="text-sm mt-0.5">✅</span>
                  <div>
                    <strong className="font-extrabold text-[11px] block uppercase tracking-wider mb-0.5">Workspace Generated & Auto-Downloaded</strong>
                    {autoDownloadTriggered ? (
                      <p>The workspace archive has been automatically downloaded. If the download didn&apos;t start, use the button below.</p>
                    ) : (
                      <p>The spec engine has reached consensus! Download your workspace archive using the button below.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Follow these simple steps to load this workspace locally:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                  <li>
                    {status?.consensusReached ? (
                      <span>Click the <strong className="text-slate-800 dark:text-slate-200">Download Workspace</strong> button below.</span>
                    ) : (
                      <span>Wait for the spec engine to complete, then click the <strong className="text-slate-800 dark:text-slate-200">Download Workspace Spec Archive (.zip)</strong> button in the UI.</span>
                    )}
                  </li>
                  <li>
                    Extract the downloaded zip archive to any folder on your local computer.
                  </li>
                  <li>
                    Open that folder in <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedIde === 'vscode' ? 'VS Code' : selectedIde === 'cursor' ? 'Cursor' : 'Kiro'}</strong>.
                  </li>
                  <li>
                    Open the integrated terminal in your IDE and run:
                    <div className="bg-slate-900 text-slate-200 font-mono p-2 rounded-lg border border-slate-800 mt-1 select-all shadow-inner flex items-center justify-between text-[11px]">
                      <span>node agent_loop.js</span>
                    </div>
                  </li>
                </ol>
              </div>

              {status?.consensusReached && (
                <button
                  type="button"
                  onClick={handleDownloadWorkspace}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Workspace Spec Archive (.zip)
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-2 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-[10px] text-slate-500 self-center">
                Files stored persistently in Firebase Storage
              </p>
              <button
                type="button"
                onClick={() => setShowIdeGuideModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
