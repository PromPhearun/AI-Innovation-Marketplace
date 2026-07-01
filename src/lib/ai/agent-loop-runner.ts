import { openai, MODEL_NAME } from './client';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import os from 'os';
import { db, storage, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, listAll, deleteObject } from 'firebase/storage';


// Security: Validate that the ideaId is strictly alphanumeric/dashes/underscores to prevent Path Traversal or Command Injection
export function validateId(id: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(id);
}

// Security: Validate that the relative workspace file path is safe and does not escape via Path Traversal
export function validateWorkspaceFilePath(filename: string): boolean {
  if (filename.includes('..') || filename.startsWith('/') || path.isAbsolute(filename)) {
    return false;
  }
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(filename);
}

// Build a rich, human-readable description of an error thrown by the OpenAI SDK
// (or the underlying fetch). The default `error.message` is often opaque
// ("aborted", "fetch failed"), so we surface the HTTP status, status text,
// API error body, and timeout/abort condition where available. This is what the
// user sees in the Live TTY Buffer and the failure banner, so it must be precise.
export function describeAiError(err: unknown): string {
  // Timeout / abort coming from AbortSignal.timeout()
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return `Request timed out / aborted after the configured limit (the LLM endpoint did not respond in time). [${err.name}]`;
  }

  const anyErr = err as {
    status?: number;
    statusText?: string;
    code?: string;
    message?: string;
    error?: { message?: string; type?: string; code?: string };
    response?: { status?: number; statusText?: string; data?: unknown };
    cause?: { code?: string; message?: string };
  };

  const parts: string[] = [];

  const httpStatus = anyErr?.status ?? anyErr?.response?.status;
  if (typeof httpStatus === 'number') {
    parts.push(`HTTP ${httpStatus}${anyErr?.statusText ? ` ${anyErr.statusText}` : ''}`);
  }

  // API error body (OpenAI/LiteLLM style)
  const apiMessage = anyErr?.error?.message;
  if (apiMessage) {
    parts.push(apiMessage);
  } else if (anyErr?.response?.data) {
    try {
      parts.push(typeof anyErr.response.data === 'string'
        ? anyErr.response.data
        : JSON.stringify(anyErr.response.data));
    } catch {}
  }

  // Network-level cause (DNS, connection refused, TLS, WAF, etc.)
  const causeCode = anyErr?.cause?.code || anyErr?.code;
  if (causeCode) {
    parts.push(`(network: ${causeCode})`);
  }

  // Detect a Cloudflare / WAF block (very common when the LLM endpoint rejects
  // the hosting server's egress IP). The HTML body contains tell-tale markers.
  const blob = `${apiMessage ?? ''} ${anyErr?.message ?? ''} ${
    typeof anyErr?.response?.data === 'string' ? anyErr.response.data : ''
  }`;
  if (
    httpStatus === 403 &&
    (/cloudflare/i.test(blob) || /you have been blocked/i.test(blob) || /Attention Required/i.test(blob))
  ) {
    parts.push(
      '— This is a Cloudflare/WAF block (HTTP 403): the AI endpoint refused this server\'s IP. ' +
      'The hosting environment\'s egress IP likely needs to be allowlisted on the LLM endpoint (e.g. litellmsa.deriv.ai).'
    );
  }


  // Fall back to the generic message if nothing more specific was captured
  if (parts.length === 0) {
    parts.push(anyErr?.message || (err instanceof Error ? err.message : String(err)) || 'Unknown error');
  } else if (anyErr?.message && !parts.join(' ').includes(anyErr.message)) {
    parts.push(`— ${anyErr.message}`);
  }

  return parts.join(' ').trim();
}

// Recursively list all files in a directory excluding common ignore paths
export function getFilesRecursively(dir: string, baseDir: string = dir): { relativePath: string; absolutePath: string }[] {

  let results: { relativePath: string; absolutePath: string }[] = [];
  if (!fs.existsSync(dir)) return results;
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const absolutePath = path.join(dir, file);
      const stat = fs.statSync(absolutePath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '.vscode' && file !== 'output' && !file.startsWith('.')) {
          results = results.concat(getFilesRecursively(absolutePath, baseDir));
        }
      } else {
        const relativePath = path.relative(baseDir, absolutePath);
        results.push({ relativePath, absolutePath });
      }
    }
  } catch (e) {
    console.error(`Error reading directory recursively ${dir}:`, e);
  }
  return results;
}

export interface LoopStatus {
  ideaId: string;
  status: 'idle' | 'running' | 'completed' | 'stopped' | 'failed';
  iteration: number;
  maxIterations: number;
  logs: string[];
  ideOpened: boolean;
  error?: string;
  filesCreated: string[];
  history: string; // content of prompthistory.md
  consensusReached?: boolean;
  // How many consecutive transient faults have occurred — used to cap auto-heal
  // retries so a persistent error (bad API key, WAF block, wrong endpoint) is
  // surfaced to the user instead of looping forever.
  faultRetries?: number;
  // In-Firestore file content map — used on Vercel (ephemeral filesystem) so
  // workspace file contents survive across serverless cold-starts. Keyed by
  // the relative file path (same values as filesCreated[]).
  fileContents?: Record<string, string>;
}

// In-memory global store to hold loop statuses across API hot-reloads
const globalWithLoops = global as typeof globalThis & {
  _agentLoops?: Record<string, LoopStatus>;
  _abortControllers?: Record<string, boolean>;
  _executionPromises?: Record<string, Promise<void>>;
};

if (!globalWithLoops._agentLoops) {
  globalWithLoops._agentLoops = {};
}
if (!globalWithLoops._abortControllers) {
  globalWithLoops._abortControllers = {};
}
if (!globalWithLoops._executionPromises) {
  globalWithLoops._executionPromises = {};
}

const agentLoops = globalWithLoops._agentLoops;
const abortControllers = globalWithLoops._abortControllers;
const executionPromises = globalWithLoops._executionPromises;

// Determine workspace base depending on the environment. For local, save on the user's Desktop.
const getWorkspaceBase = () => {
  const isCloudHost = 
    process.env.VERCEL === '1' || 
    process.env.VERCEL === 'true' || 
    !!process.env.VERCEL || 
    !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
    !!process.env.NETLIFY || 
    !!process.env.RENDER || 
    !!process.env.FLY_APP_NAME || 
    !!process.env.HEROKU_APP_ID;

  if (isCloudHost) {
    return path.join(process.cwd(), 'agent_workspace');
  }
  return path.join(os.homedir(), 'Desktop', 'agent_workspace');
};

const WORKSPACE_BASE = getWorkspaceBase();

export function getWorkspacePath(ideaId: string): string {
  const folderName = ideaId.startsWith('idea_') ? ideaId : `idea_${ideaId}`;
  return path.join(WORKSPACE_BASE, folderName);
}

// Recursively delete a directory (Node 14+ has fs.rmSync with recursive)
function removeDirRecursive(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn(`Failed to remove workspace directory ${dir}:`, e);
  }
}

/**
 * Completely wipe all persisted state and workspace artifacts for an idea so a
 * brand-new "Launch Spec Engine" run truly starts from scratch. This clears:
 *   1. The in-memory status cache + abort flag
 *   2. The Firestore agentLoops/{ideaId} document
 *   3. All Firebase Storage files under ideas/{ideaId}/agent_workspace/
 *   4. The local workspace directory on disk
 */
export async function clearAgentLoopWorkspace(ideaId: string): Promise<void> {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }

  // 1. In-memory cache + abort flag
  delete agentLoops[ideaId];
  delete abortControllers[ideaId];
  delete executionPromises[ideaId];

  // 2. Firestore status document
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'agentLoops', ideaId));
    } catch (e) {
      console.warn(`Failed to delete Firestore agentLoops doc for ${ideaId}:`, e);
    }
  }

  // 3. Firebase Storage workspace files
  if (isFirebaseConfigured && storage) {
    try {
      const dirRef = ref(storage, `ideas/${ideaId}/agent_workspace`);
      const listing = await listAll(dirRef);
      // Delete files at this level and recurse one level into subfolders
      await Promise.all(listing.items.map(item => deleteObject(item).catch(() => {})));
      for (const prefix of listing.prefixes) {
        const sub = await listAll(prefix);
        await Promise.all(sub.items.map(item => deleteObject(item).catch(() => {})));
      }
    } catch (e) {
      console.warn(`Failed to clear Firebase Storage workspace for ${ideaId}:`, e);
    }
  }

  // 4. Local workspace directory
  removeDirRecursive(getWorkspacePath(ideaId));
}


// Helper to save Agent Loop Status (caches in memory and, if firebase is configured, saves to Firestore)
export async function saveAgentLoopStatus(ideaId: string, status: LoopStatus): Promise<void> {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }
  agentLoops[ideaId] = status;
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'agentLoops', ideaId), status);
    } catch (e) {
      console.error(`Failed to save agent loop status to Firestore for idea ${ideaId}:`, e);
    }
  }
}

// A persisted status is only worth restoring when opening the panel if it
// represents something the user would want to keep:
//   - a run that actually reached consensus (valuable approved specs), or
//   - a run that is still actively executing (must not be interrupted).
// Any other state (failed, stopped, or an incomplete/idle run that never
// reached consensus) is stale error residue and should NOT be resurfaced —
// the panel must start fresh instead of showing old .md files, error banners,
// and Live TTY Buffer logs.
function isRestorableStatus(status: LoopStatus | null | undefined): boolean {
  if (!status) return false;
  if (status.consensusReached === true) return true;
  if (status.status === 'running') return true;
  return false;
}

// Build a clean, fresh idle status with no stale files, logs, or errors.
function buildFreshIdleStatus(ideaId: string): LoopStatus {
  return {
    ideaId,
    status: 'idle',
    iteration: 0,
    maxIterations: 5,
    logs: ['Agent Loop system initialized. Ready to launch.'],
    ideOpened: false,
    filesCreated: [],
    history: '',
    consensusReached: false,
  };
}

// Synchronous fast getter of Agent Loop Status from memory cache
export function getAgentLoopStatusSync(ideaId: string): LoopStatus {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }
  const existing = agentLoops[ideaId];
  if (existing) {
    return existing;
  }
  const defaultStatus: LoopStatus = {
    ideaId,
    status: 'idle',
    iteration: 0,
    maxIterations: 5,
    logs: ['Agent Loop system initialized. Ready to launch.'],
    ideOpened: false,
    filesCreated: [],
    history: '',
    consensusReached: false
  };
  agentLoops[ideaId] = defaultStatus;
  return defaultStatus;
}

// Asynchronous getter of Agent Loop Status (checks Firestore if Firebase is configured, with local fallback)
export async function getAgentLoopStatus(ideaId: string): Promise<LoopStatus> {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }

  // Fast path: memory cache.
  // IMPORTANT: When a run is actively in-progress (status === 'running'), always
  // trust the in-memory cache over Firestore. The in-memory state is the source
  // of truth during execution — writeWorkspaceFile() updates it synchronously
  // before firing a background Firestore save. Re-fetching Firestore here would
  // overwrite freshly-written file lists with a slightly-older persisted snapshot,
  // causing the Builder/Critic to see an empty workspace even after scaffold writes.
  const existing = agentLoops[ideaId];
  if (existing) {
    // Only refresh from Firestore when the loop is idle/completed/stopped/failed
    // (i.e., a different serverless instance may have updated it), NOT while running.
    if (existing.status !== 'running' && isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'agentLoops', ideaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as LoopStatus;
          agentLoops[ideaId] = data;
          return data;
        }
      } catch (e) {
        console.error('Error fetching loop status from Firestore:', e);
      }
    }
    return existing;
  }

  // Slow path: Firestore or local files
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'agentLoops', ideaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as LoopStatus;
        // Only restore a previously-persisted run if it's worth keeping
        // (consensus reached or still actively running). A stale failed/stopped/
        // incomplete run must NOT resurface its error files, banner, or logs —
        // wipe it and present a clean fresh slate instead.
        if (isRestorableStatus(data)) {
          agentLoops[ideaId] = data;
          return data;
        }
        await clearAgentLoopWorkspace(ideaId);
        const fresh = buildFreshIdleStatus(ideaId);
        agentLoops[ideaId] = fresh;
        return fresh;
      }
    } catch (e) {
      console.error('Error fetching loop status from Firestore:', e);
    }
  }

  // Local filesystem fallback
  const workspacePath = getWorkspacePath(ideaId);
  const historyPath = path.join(workspacePath, 'prompthistory.md');
  
  let history = '';
  if (fs.existsSync(historyPath)) {
    try {
      history = fs.readFileSync(historyPath, 'utf8');
    } catch {}
  }

  let filesCreated: string[] = [];
  if (fs.existsSync(workspacePath)) {
    filesCreated = getFilesRecursively(workspacePath).map(f => f.relativePath);
  }

  const consensusReached = history.includes('STATUS: APPROVED');

  // If there are leftover workspace artifacts from a previous run that never
  // reached consensus, they are stale error residue (old .md files, partial
  // specs, failure logs). Don't resurface them — wipe the workspace and start
  // from a clean, fresh slate so the panel opens with no errors or old files.
  if (filesCreated.length > 0 && !consensusReached) {
    await clearAgentLoopWorkspace(ideaId);
    const fresh = buildFreshIdleStatus(ideaId);
    agentLoops[ideaId] = fresh;
    return fresh;
  }

  const defaultStatus: LoopStatus = {
    ideaId,
    status: 'idle',
    iteration: 0,
    maxIterations: 5,
    logs: ['Agent Loop system initialized. Ready to launch.'],
    ideOpened: false,
    filesCreated,
    history,
    consensusReached
  };

  agentLoops[ideaId] = defaultStatus;
  return defaultStatus;
}

// Asynchronously writes a file to Firebase Storage if configured, and also tries to write locally
export async function writeWorkspaceFile(ideaId: string, filename: string, content: string): Promise<void> {
  if (!validateId(ideaId) || !validateWorkspaceFilePath(filename)) {
    throw new Error(`Invalid file path format: ${filename}`);
  }

  // 1. Cloud Storage Write
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, `ideas/${ideaId}/agent_workspace/${filename}`);
      const buffer = Buffer.from(content, 'utf-8');
      await uploadBytes(storageRef, buffer);
    } catch (e) {
      console.error(`Firebase Storage write failed for ${filename}:`, e);
    }
  }

  // 2. Local Disk Write
  try {
    const workspacePath = getWorkspacePath(ideaId);
    const filePath = path.join(workspacePath, filename);
    const dirPath = path.dirname(filePath);
    if (dirPath && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (e) {
    console.warn(`Local filesystem write skipped/failed for ${filename}:`, e);
  }

  // 3. Keep loop status updated — directly mutate the in-memory cache first to
  //    avoid a round-trip getAgentLoopStatus() call that can race or return stale
  //    data (especially important for prompthistory.md whose content drives the
  //    UI's "Self-Consensus Audit History" section and the consensusReached flag).
  if (!agentLoops[ideaId]) {
    // Ensure a baseline entry exists if this is the very first write
    agentLoops[ideaId] = {
      ideaId,
      status: 'running',
      iteration: 0,
      maxIterations: 5,
      logs: [],
      ideOpened: false,
      filesCreated: [],
      history: '',
      consensusReached: false,
    };
  }
  const cachedStatus = agentLoops[ideaId];
  if (!cachedStatus.filesCreated.includes(filename)) {
    cachedStatus.filesCreated.push(filename);
  }
  if (filename === 'prompthistory.md') {
    cachedStatus.history = content;
    cachedStatus.consensusReached = content.includes('STATUS: APPROVED');
  }
  // Store file content in the LoopStatus so it survives Vercel cold-starts.
  // On serverless environments the local filesystem is ephemeral and lost between
  // requests, so we persist every file's content directly in the Firestore doc.
  if (!cachedStatus.fileContents) {
    cachedStatus.fileContents = {};
  }
  cachedStatus.fileContents[filename] = content;
  await saveAgentLoopStatus(ideaId, cachedStatus);
}

// Asynchronously reads a file from Firebase Storage if configured, with local filesystem fallback
export async function readWorkspaceFile(ideaId: string, filename: string): Promise<string> {
  if (!validateId(ideaId) || !validateWorkspaceFilePath(filename)) {
    throw new Error(`Invalid file path format: ${filename}`);
  }

  // 0. In-memory / Firestore fileContents map — fastest path, survives Vercel cold-starts.
  //    This is populated by writeWorkspaceFile() on every write, so it is always the
  //    most up-to-date source of truth across serverless function instances.
  const memStatus = agentLoops[ideaId];
  if (memStatus?.fileContents?.[filename] !== undefined) {
    return memStatus.fileContents[filename];
  }

  // If not in memory, try to load the Firestore-persisted status which also carries fileContents.
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'agentLoops', ideaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as LoopStatus;
        if (data?.fileContents?.[filename] !== undefined) {
          // Warm the in-memory cache so subsequent reads in the same request are instant.
          agentLoops[ideaId] = data;
          return data.fileContents[filename];
        }
      }
    } catch (e) {
      console.warn(`Firestore fileContents read failed for ${filename}:`, e);
    }
  }

  // 1. Read from Firebase Storage
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, `ideas/${ideaId}/agent_workspace/${filename}`);
      const bytes = await getBytes(storageRef);
      return Buffer.from(bytes).toString('utf-8');
    } catch (e) {
      console.warn(`Firebase Storage read failed for ${filename}, falling back to local:`, e);
    }
  }

  // 2. Local fallback
  const workspacePath = getWorkspacePath(ideaId);
  const filePath = path.join(workspacePath, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  return '';
}

// Check if file exists in active workspace (either via memory/Firestore file list or locally)
export async function workspaceFileExists(ideaId: string, filename: string): Promise<boolean> {
  if (!validateId(ideaId) || !validateWorkspaceFilePath(filename)) {
    return false;
  }

  const status = await getAgentLoopStatus(ideaId);
  if (status.filesCreated.includes(filename)) {
    return true;
  }

  const workspacePath = getWorkspacePath(ideaId);
  const filePath = path.join(workspacePath, filename);
  return fs.existsSync(filePath);
}

export function stopAgentLoop(ideaId: string) {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }
  abortControllers[ideaId] = true;
  const existing = agentLoops[ideaId];
  if (existing) {
    existing.status = 'stopped';
    existing.logs.push('🛑 [User Triggered Kill Switch] Agent Loop stopped immediately.');
    if (isFirebaseConfigured && db) {
      saveAgentLoopStatus(ideaId, existing).catch((err) => {
        console.error('Failed to sync stopped status to Firestore:', err);
      });
    }
  }

  // Also write a kill.lock file in the workspace directory if it exists, to stop any running local terminal agent loop instantly
  const workspacePath = getWorkspacePath(ideaId);
  try {
    if (!fs.existsSync(WORKSPACE_BASE)) {
      fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
    }
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    fs.writeFileSync(path.join(workspacePath, 'kill.lock'), 'STOP', 'utf8');
  } catch (e) {
    console.error('Failed to write kill.lock:', e);
  }
}

export function appendLog(ideaId: string, message: string) {
  const status = getAgentLoopStatusSync(ideaId);
  // Embed an ISO-8601 timestamp so the UI can render it in the viewer's local
  // computer time (the server may run in UTC on cloud hosts like Vercel).
  const timestamp = new Date().toISOString();
  status.logs.push(`[${timestamp}] ${message}`);
  console.log(`[AgentLoop ${ideaId}] ${message}`);
  if (isFirebaseConfigured && db) {
    saveAgentLoopStatus(ideaId, status).catch((err) => {
      console.error('Failed to sync logs to Firestore in background:', err);
    });
  }
}

// Safely open the IDE using standard sanitized environment variables or safe command executions
export function launchIDE(ideaId: string, ide: 'vscode' | 'cursor' | 'kiro'): boolean {
  if (!validateId(ideaId)) {
    return false;
  }

  const workspacePath = getWorkspacePath(ideaId);
  
  // Verify directory exists
  if (!fs.existsSync(workspacePath)) {
    return false;
  }

  // Security check: Only run child_process when executed locally.
  // We identify cloud serverless/hosting environments specifically to support local production-mode testing.
  const isCloudHost = 
    process.env.VERCEL === '1' || 
    process.env.VERCEL === 'true' || 
    !!process.env.VERCEL || 
    !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
    !!process.env.NETLIFY || 
    !!process.env.RENDER || 
    !!process.env.FLY_APP_NAME || 
    !!process.env.HEROKU_APP_ID || 
    process.env.AI_MARKETPLACE_CLOUD_ENV === 'true';

  if (isCloudHost) {
    appendLog(ideaId, `⚠️ Cloud host detected. IDE launch command skipped for safety.`);
    return false;
  }

  let cmd = '';
  const rootFile = path.join(workspacePath, 'README.md');
  if (process.platform === 'darwin') {
    if (ide === 'cursor') {
      // 1. Try PATH command (opens workspace folder, sleeps 1s, then opens README.md inside that new workspace window)
      // 2. Try macOS bundled CLI path directly
      // 3. Try open -b (bundle ID)
      // 4. Try open -a (app name)
      cmd = `(cursor "${workspacePath}" && sleep 1 && cursor "${rootFile}") 2>/dev/null || ` +
            `("/Applications/Cursor.app/Contents/Resources/app/bin/cursor" "${workspacePath}" 2>/dev/null && sleep 1 && "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" "${rootFile}" 2>/dev/null) || ` +
            `(open -b "com.todesktop.230313mzl4w4u92" "${workspacePath}" && sleep 1 && open -b "com.todesktop.230313mzl4w4u92" "${rootFile}") 2>/dev/null || ` +
            `(open -a "Cursor" "${workspacePath}" && sleep 1 && open -a "Cursor" "${rootFile}")`;
    } else if (ide === 'vscode') {
      // 1. Try PATH command
      // 2. Try macOS bundled CLI path directly
      // 3. Try open -b (bundle ID)
      // 4. Try open -a (app name)
      cmd = `(code "${workspacePath}" && sleep 1 && code "${rootFile}") 2>/dev/null || ` +
            `("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "${workspacePath}" 2>/dev/null && sleep 1 && "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "${rootFile}" 2>/dev/null) || ` +
            `(open -b "com.microsoft.VSCode" "${workspacePath}" && sleep 1 && open -b "com.microsoft.VSCode" "${rootFile}") 2>/dev/null || ` +
            `(open -a "Visual Studio Code" "${workspacePath}" && sleep 1 && open -a "Visual Studio Code" "${rootFile}")`;
    } else if (ide === 'kiro') {
      // 1. Try Kiro's bundled code binary directly
      // 2. Try kiro in PATH
      // 3. Try open -b (bundle ID)
      // 4. Try open -a (app name)
      cmd = `("/Applications/Kiro.app/Contents/Resources/app/bin/code" "${workspacePath}" 2>/dev/null && sleep 1 && "/Applications/Kiro.app/Contents/Resources/app/bin/code" "${rootFile}" 2>/dev/null) || ` +
            `(kiro "${workspacePath}" 2>/dev/null && sleep 1 && kiro "${rootFile}" 2>/dev/null) || ` +
            `(open -b "dev.kiro.desktop" "${workspacePath}" && sleep 1 && open -b "dev.kiro.desktop" "${rootFile}") 2>/dev/null || ` +
            `(open -a "Kiro" "${workspacePath}" && sleep 1 && open -a "Kiro" "${rootFile}")`;
    } else {
      cmd = `open "${workspacePath}"`;
    }
  } else if (process.platform === 'win32') {
    if (ide === 'cursor') {
      cmd = `cursor "${workspacePath}" && timeout /t 1 /nobreak >nul && cursor "${rootFile}" || start "" cursor "${workspacePath}" && timeout /t 1 /nobreak >nul && start "" cursor "${rootFile}"`;
    } else if (ide === 'vscode') {
      cmd = `code "${workspacePath}" && timeout /t 1 /nobreak >nul && code "${rootFile}" || start "" code "${workspacePath}" && timeout /t 1 /nobreak >nul && start "" code "${rootFile}"`;
    } else if (ide === 'kiro') {
      cmd = `kiro "${workspacePath}" && timeout /t 1 /nobreak >nul && kiro "${rootFile}" 2>nul || start "" kiro "${workspacePath}" 2>nul || explorer "${workspacePath}"`;
    } else {
      cmd = `explorer "${workspacePath}"`;
    }
  } else {
    // Linux/Other
    if (ide === 'cursor') {
      cmd = `cursor "${workspacePath}" && sleep 1 && cursor "${rootFile}"`;
    } else if (ide === 'vscode') {
      cmd = `code "${workspacePath}" && sleep 1 && code "${rootFile}"`;
    } else if (ide === 'kiro') {
      cmd = `kiro "${workspacePath}" 2>/dev/null && sleep 1 && kiro "${rootFile}" 2>/dev/null || xdg-open "${workspacePath}"`;
    } else {
      cmd = `xdg-open "${workspacePath}"`;
    }
  }

  appendLog(ideaId, `🚀 Launching local IDE (${ide}) targeting workspace: ${workspacePath}`);
  exec(cmd, (err) => {
    if (err) {
      appendLog(ideaId, `⚠️ Failed to open local IDE: ${err.message}. (Is "${ide}" command-line launcher installed in PATH?)`);
    } else {
      appendLog(ideaId, `✅ IDE "${ide}" successfully opened.`);
      if (agentLoops[ideaId]) {
        agentLoops[ideaId].ideOpened = true;
      }
    }
  });

  return true;
}

export async function executeDeveloperLoop(
  ideaId: string,
  ideaTitle: string,
  ideaDesc: string,
  status: LoopStatus,
  ideToOpen?: 'vscode' | 'cursor' | 'kiro'
) {
  const workspacePath = getWorkspacePath(ideaId);
  
  // Start automated Developer loop (5 cycles) to write actual code files
  appendLog(ideaId, `🚀 Consensus reached! Initiating 5-iteration automated Developer Code-Writing Loop...`);
  
  const devHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    {
      role: 'system',
      content: `You are "The Builder-Developer AI", an elite full-stack engineer and automation agent.
Your task is to write actual WORKING code files inside this local workspace folder to implement the project described in goal.md and the approved specs (requirements.md, architecture.md).

RULES:
1. Examine the current workspace files provided by the user.
2. Decide what packages, files, or scripts are required to make this program compile, build, or run correctly.
3. Write actual, production-ready, complete code. Do not use placeholders or write TODOs.
4. Output your file creations or edits using this EXACT syntax:
@@@ FILE: filename.js
[exact content of the file]
@@@ END FILE @@@

5. You can create multiple files in a single turn.

Analyze the goals, create a complete folder structure, write package.json, src files, configs, tests, etc.`
    }
  ];

  let devErrorLog = '';
  const startIter = status.iteration;
  const targetIter = startIter + 5;

  const initialStatus = await getAgentLoopStatus(ideaId);
  initialStatus.maxIterations = targetIter;
  initialStatus.status = 'running';
  await saveAgentLoopStatus(ideaId, initialStatus);

  for (let devIter = 1; devIter <= 5; devIter++) {
    if (abortControllers[ideaId]) {
      appendLog(ideaId, `🛑 Developer loop execution stopped by user.`);
      const stoppedStatus = await getAgentLoopStatus(ideaId);
      stoppedStatus.status = 'stopped';
      await saveAgentLoopStatus(ideaId, stoppedStatus);
      return;
    }

    const iterStatus = await getAgentLoopStatus(ideaId);
    iterStatus.iteration = startIter + devIter;
    await saveAgentLoopStatus(ideaId, iterStatus);

    appendLog(ideaId, `⚙️ Starting Developer Iteration ${devIter} of 5...`);

    // Reload files list
    const currentStatus = await getAgentLoopStatus(ideaId);
    const currentDevFiles = isFirebaseConfigured ? currentStatus.filesCreated : getFilesRecursively(workspacePath).map(f => f.relativePath);
    const devFilesToSupply = currentDevFiles.filter(rel => 
      !rel.startsWith('.') &&
      !rel.startsWith('node_modules/') &&
      rel !== 'agent_loop.js' &&
      rel !== 'kill.lock' &&
      (rel.endsWith('.md') || rel.endsWith('.txt') || rel.endsWith('.json') || rel.endsWith('.js') || rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.html') || rel.endsWith('.css'))
    );

    const devFileContents: string[] = [];
    for (const file of devFilesToSupply) {
      const content = await readWorkspaceFile(ideaId, file);
      devFileContents.push(`### FILE: ${file}\n\`\`\`\n${content}\n\`\`\``);
    }
    const filesContext = devFileContents.join('\n\n');

    let devPrompt = `Goal Description:\n${ideaDesc}\n\n${filesContext}`;
    if (devErrorLog) {
      devPrompt += `\n\n⚠️ PREVIOUS BUILD/COMPILE ERRORS OR QA CRITIQUE:\n${devErrorLog}\n\nPlease address and resolve these issues in this iteration!`;
      devErrorLog = ''; // reset
    }

    devHistory.push({ role: 'user', content: devPrompt });
    appendLog(ideaId, `🤖 Calling AI Developer to generate/refine code...`);

    try {
      const devAbort = AbortSignal.timeout(270_000);
      const devResponse = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: devHistory,
        temperature: 0.3
      }, { signal: devAbort });

      const devText = devResponse.choices[0]?.message?.content || '';
      devHistory.push({ role: 'assistant', content: devText });

      // Parse and write file blocks
      const devFileRegex = /@@@ FILE:\s*([a-zA-Z0-9_\-\.\/]+)\r?\n([\s\S]*?)\r?\n@@@ END FILE @@@/g;
      let devMatch;
      const devFilesUpdated: string[] = [];

      while ((devMatch = devFileRegex.exec(devText)) !== null) {
        const filename = devMatch[1].trim();
        const content = devMatch[2];

        if (filename && validateWorkspaceFilePath(filename)) {
          await writeWorkspaceFile(ideaId, filename, content);
          devFilesUpdated.push(filename);
          appendLog(ideaId, `✍️ AI Developer created/updated: ${filename}`);
        } else if (filename) {
          appendLog(ideaId, `⚠️ Blocked write of invalid or unsafe file path: ${filename}`);
        }
      }

      if (devFilesUpdated.length === 0) {
        appendLog(ideaId, `ℹ️ AI Developer suggested modifications but didn't write formatted file blocks.`);
      }

      // Run tests/compilation check inside workspace locally (only if local package.json exists)
      const hasPackageJson = await workspaceFileExists(ideaId, 'package.json');
      if (hasPackageJson) {
        appendLog(ideaId, `⚙️ package.json found. Running build/compile verification...`);
        try {
          const isCloudHostLocal = 
            process.env.VERCEL === '1' || 
            process.env.VERCEL === 'true' || 
            !!process.env.VERCEL || 
            !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
            !!process.env.NETLIFY || 
            !!process.env.RENDER || 
            !!process.env.FLY_APP_NAME || 
            !!process.env.HEROKU_APP_ID || 
            process.env.AI_MARKETPLACE_CLOUD_ENV === 'true';

          if (!isCloudHostLocal) {
            const nodeModulesPath = path.join(workspacePath, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
              appendLog(ideaId, `📦 Installing npm dependencies...`);
              execSync('npm install', { cwd: workspacePath, stdio: 'pipe' });
            }

            const localPackageJsonPath = path.join(workspacePath, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(localPackageJsonPath, 'utf8'));
            if (pkg.scripts && pkg.scripts.build) {
              appendLog(ideaId, `🛠 Compiling build: running 'npm run build'...`);
              execSync('npm run build', { cwd: workspacePath, stdio: 'pipe' });
              appendLog(ideaId, `✅ Build compiled successfully without errors!`);
            } else {
              const mainFile = pkg.main || 'index.js';
              const mainFilePath = path.join(workspacePath, mainFile);
              if (fs.existsSync(mainFilePath)) {
                execSync(`node -c "${mainFilePath}"`, { stdio: 'pipe' });
                appendLog(ideaId, `✅ Syntax check passed for main file: ${mainFile}`);
              }
            }
          } else {
            appendLog(ideaId, `⚠️ Cloud environment. Skipped local compilation execution check.`);
          }
        } catch (execErr: unknown) {
          appendLog(ideaId, `⚠️ Build / Syntax test failed. Logging error for AI correction.`);
          const errMessage = execErr instanceof Error ? execErr.message : String(execErr);
          devErrorLog = errMessage;
        }
      }

      // Step 3: QA VERIFIER AUDIT
      appendLog(ideaId, `🕵️ QA Verifier is auditing the implementation...`);
      
      const auditStatus = await getAgentLoopStatus(ideaId);
      const verifierFiles = isFirebaseConfigured ? auditStatus.filesCreated : getFilesRecursively(workspacePath).map(f => f.relativePath);
      const verifierFilesToSupply = verifierFiles.filter(rel => 
        !rel.startsWith('.') &&
        !rel.startsWith('node_modules/') &&
        rel !== 'agent_loop.js' &&
        rel !== 'kill.lock' &&
        (rel.endsWith('.md') || rel.endsWith('.txt') || rel.endsWith('.json') || rel.endsWith('.js') || rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.html') || rel.endsWith('.css'))
      );

      const verifierFileContents: string[] = [];
      for (const file of verifierFilesToSupply) {
        const content = await readWorkspaceFile(ideaId, file);
        verifierFileContents.push(`### FILE: ${file}\n\`\`\`\n${content}\n\`\`\``);
      }
      const verifierContext = verifierFileContents.join('\n\n');

      const verifierPrompt = `You are "The QA Verifier AI", an elite senior code auditor, QA tester, and software security engineer.
Your task is to inspect the codebase generated by the AI Developer and verify if the project is 100% complete, fully functional, secure, compiles perfectly, and meets the high-level goals.

Check for:
1. Security vulnerabilities (input validation, SQL/Command injection, XSS, insecure dependencies).
2. Code quality (clear structure, robust error handling, proper imports/exports, no TODOs/placeholders).
3. Functional completeness (all requirements from goal.md are implemented).
4. Build status (any syntax/compile errors from previous test runs).

Goal Description:
${ideaDesc}

Workspace State:
${verifierContext}

Build/Compile Status:
${devErrorLog || 'No build errors.'}

If the project is completely implemented, is fully functional, has absolutely no errors, has zero placeholders/TODOs, and is ready for production, output the exact phrase: "STATUS: VERIFIED"
Otherwise, list the remaining issues, missing features, or bugs that the AI Developer must resolve in the next iteration. Be constructive and highly specific.`;

      const verifierAbort = AbortSignal.timeout(270_000);
      const verifierResponse = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: 'You are an elite software auditor and QA verifier.' },
          { role: 'user', content: verifierPrompt }
        ],
        temperature: 0.1
      }, { signal: verifierAbort });

      const verifierText = verifierResponse.choices[0]?.message?.content || '';
      appendLog(ideaId, `🕵️ QA Verifier Audit completed.`);

      const isVerified = verifierText.includes('STATUS: VERIFIED');

      if (isVerified) {
        if (devErrorLog) {
          appendLog(ideaId, `⚠️ QA Verifier claimed VERIFIED, but there are build/compile errors. Continuing loop to resolve errors...`);
        } else {
          appendLog(ideaId, `🎉 QA Verifier has officially approved the implementation and marked it as VERIFIED!`);
          break;
        }
      } else {
        appendLog(ideaId, `❌ Verification failed. QA Verifier identified issues:\n${verifierText}`);
        devErrorLog = verifierText;
      }

    } catch (devErr: unknown) {
      const errMessage = devErr instanceof Error ? devErr.message : String(devErr);
      appendLog(ideaId, `❌ Error calling AI Developer in iteration ${devIter}: ${errMessage}`);
    }
  }

  appendLog(ideaId, `🎉 Developer loop completed successfully.`);
  const finalStatus = await getAgentLoopStatus(ideaId);
  finalStatus.status = 'completed';
  await saveAgentLoopStatus(ideaId, finalStatus);

  if (ideToOpen) {
    launchIDE(ideaId, ideToOpen);
  }
}

/**
 * Execute exactly one iteration of the spec engine (Builder + Critic cycle).
 * Vercel/serverless-friendly: one iteration per HTTP request.
 * Saves status and returns updated status.
 */
export async function runAgentLoopIteration(ideaId: string): Promise<LoopStatus> {
  if (!validateId(ideaId)) throw new Error('Invalid Idea ID format');

  const status = await getAgentLoopStatus(ideaId);

  // If a previous iteration was cut off by a serverless timeout the status may
  // be persisted as 'failed'. Auto-heal it back to 'running', but only up to
  // MAX_FAULT_RETRIES times so a persistent error (bad key, WAF block, wrong
  // endpoint) is surfaced to the user instead of looping forever.
  const MAX_FAULT_RETRIES = 3;
  if (status && status.status === 'failed' && status.iteration < status.maxIterations) {
    const retries = status.faultRetries ?? 0;
    if (retries < MAX_FAULT_RETRIES) {
      appendLog(ideaId, `⚠️ Previous iteration ended with a fault (retry ${retries + 1}/${MAX_FAULT_RETRIES}). Auto-recovering…`);
      status.status = 'running';
      status.faultRetries = retries + 1;
      // Preserve status.error so it remains visible in the error banner while retrying
      await saveAgentLoopStatus(ideaId, status);
    } else {
      // Exceeded retry cap — keep status as 'failed' and return so the error
      // banner in the UI shows the exact error and stops the loop.
      appendLog(ideaId, `❌ Auto-recovery limit (${MAX_FAULT_RETRIES}) reached. Stopping loop. Error: ${status.error || 'unknown'}`);
      await saveAgentLoopStatus(ideaId, status);
      return status;
    }
  }

  if (!status || status.status !== 'running') {
    return status;
  }

  // Cross-process kill switch: check for kill.lock file written by stopAgentLoop
  // (abortControllers only works within the same Node.js process; on Vercel each
  //  request lands in a different worker so we need this file-based fallback).
  const killLockPath = path.join(getWorkspacePath(ideaId), 'kill.lock');
  if (fs.existsSync(killLockPath)) {
    appendLog(ideaId, '🛑 Kill lock detected. Agent Loop stopped by user.');
    status.status = 'stopped';
    await saveAgentLoopStatus(ideaId, status);
    return status;
  }

  // Check abort
  if (abortControllers[ideaId]) {
    appendLog(ideaId, '🛑 Agent Loop execution stopped by user.');
    status.status = 'stopped';
    await saveAgentLoopStatus(ideaId, status);
    return status;
  }

  // If consensus already reached, run one developer iteration
  if (status.consensusReached) {
    await executeDeveloperLoopIteration(ideaId, status);
    return await getAgentLoopStatus(ideaId);
  }

  // Check if max iterations reached
  if (status.iteration >= status.maxIterations) {
    appendLog(ideaId, `🏁 Max iterations (${status.maxIterations}) completed.`);
    status.status = 'completed';
    await saveAgentLoopStatus(ideaId, status);
    return status;
  }

  status.iteration++;
  appendLog(ideaId, `🔄 Starting Iteration ${status.iteration} of ${status.maxIterations}`);

  await executeSpecIteration(ideaId, status);

  // Bug fix: After the final spec iteration completes without the Critic approving
  // the spec, the status is still 'running' (Critic only sets 'completed' when it
  // outputs "STATUS: APPROVED"). We must transition to 'completed' here so the
  // panel stops firing new iterate requests. Without this, the panel's fetchStatus
  // sees status='running' with iteration=maxIterations and keeps re-enabling polling,
  // causing an infinite loop beyond the intended max iteration count.
  const afterIterStatus = await getAgentLoopStatus(ideaId);
  if (
    afterIterStatus.status === 'running' &&
    afterIterStatus.iteration >= afterIterStatus.maxIterations &&
    !afterIterStatus.consensusReached
  ) {
    appendLog(ideaId, `🏁 Max iterations (${afterIterStatus.maxIterations}) reached without consensus. Spec engine loop complete.`);
    afterIterStatus.status = 'completed';
    await saveAgentLoopStatus(ideaId, afterIterStatus);
    return afterIterStatus;
  }

  return afterIterStatus;
}

// Maximum total characters of workspace file content to include in a single
// Builder or Critic prompt. This prevents token overflows that cause HTTP 500
// errors from the LiteLLM gateway (the upstream model refuses oversized requests).
// At ~4 chars/token this is roughly 10,000 tokens of file content — well within
// any model's context window when combined with the system/user prompt overhead.
const MAX_CONTEXT_CHARS = 40_000;

/**
 * Truncate an assembled file-context string to MAX_CONTEXT_CHARS, keeping as
 * many complete ### FILE blocks as possible (drops the tail, not the middle).
 */
function truncateContext(context: string): string {
  if (context.length <= MAX_CONTEXT_CHARS) return context;
  // Truncate and append a notice so the model knows content was cut
  const truncated = context.slice(0, MAX_CONTEXT_CHARS);
  // Find the last complete file block boundary to avoid mid-block cuts
  const lastEnd = truncated.lastIndexOf('\n@@@ END FILE @@@');
  const cutPoint = lastEnd > 0 ? lastEnd + '\n@@@ END FILE @@@'.length : MAX_CONTEXT_CHARS;
  return context.slice(0, cutPoint) + '\n\n[...context truncated to fit token limit — remaining files omitted...]\n';
}

/**
 * Call the OpenAI-compatible endpoint with automatic retry for transient HTTP
 * 5xx errors. LiteLLM gateways occasionally return 500 under heavy load; a
 * single retry with a short delay resolves most cases without surfacing the
 * error to the user. Persistent errors (401/403/timeout) are NOT retried.
 */
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

async function callAIWithRetry(
  params: ChatCompletionCreateParamsNonStreaming,
  signal: AbortSignal,
  maxRetries = 2,
  retryDelayMs = 4_000
): Promise<ChatCompletion> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params, { signal });
    } catch (err: unknown) {
      lastErr = err;
      const anyErr = err as { status?: number; name?: string };
      const httpStatus = anyErr?.status;
      // Do not retry on: timeout/abort, 4xx client errors, or last attempt
      const isTimeout = anyErr?.name === 'TimeoutError' || anyErr?.name === 'AbortError';
      const isClientError = typeof httpStatus === 'number' && httpStatus >= 400 && httpStatus < 500;
      if (isTimeout || isClientError || attempt >= maxRetries) {
        throw err;
      }
      // Transient 5xx — wait briefly and retry
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastErr;
}

/**
 * Execute one Builder + Critic spec iteration.
 */
async function executeSpecIteration(ideaId: string, status: LoopStatus): Promise<void> {
  const workspacePath = getWorkspacePath(ideaId);
  // Bug fix: use the in-memory/Firestore file list when Firebase is configured so
  // the Builder gets file context even when there is no local filesystem (cloud/Vercel).
  const currentStatus = await getAgentLoopStatus(ideaId);
  const currentFiles = isFirebaseConfigured
    ? currentStatus.filesCreated
    : getFilesRecursively(workspacePath).map(f => f.relativePath);
  const filesToSupply = currentFiles.filter(rel =>
    !rel.startsWith('.') && !rel.startsWith('node_modules/') &&
    rel !== 'agent_loop.js' && rel !== 'kill.lock' &&
    /\.(md|txt|json|js|ts|tsx|html|css)$/.test(rel)
  );

  const fileContents: string[] = [];
  for (const file of filesToSupply) {
    const content = await readWorkspaceFile(ideaId, file);
    fileContents.push(`### FILE: ${file}\n\`\`\`\n${content}\n\`\`\``);
  }
  // Truncate to prevent token overflows that cause HTTP 500 from the LLM gateway
  const currentFilesContent = truncateContext(fileContents.join('\n\n'));

  // === BUILDER PERSONA ===
  appendLog(ideaId, '🤖 Persona A (The Builder) is drafting updates...');
  const builderPrompt = `You are "The Builder AI", an expert software architect, requirements engineer, and software developer.
Your goal is to build out a complete, production-grade technical design, requirements specification, and architecture blueprint inside this workspace.

Here is the current state of files in the workspace:
${currentFilesContent}

Analyze these files and any critique provided previously. Rewrite or add content to these files to make them complete, robust, and professional.

You MUST format your output as a series of instructions containing the file contents to write, like this:
@@@ FILE: filename.md
[New file content here]
@@@ END FILE @@@

Ensure you cover architecture, API specs, database schemes, folder layouts, and requirements. Write actual, highly-specific content rather than placeholders.`;

  let builderResponse;
  try {
    // Use 110s timeout — well under Vercel's 300s maxDuration so we get a
    // graceful TimeoutError instead of a silent hard-kill from the gateway.
    const builderAbort = AbortSignal.timeout(110_000);
    builderResponse = await callAIWithRetry({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You are an elite developer and software builder.' },
        { role: 'user', content: builderPrompt }
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }, builderAbort);
  } catch (err: unknown) {
    const errMsg = describeAiError(err);
    appendLog(ideaId, `❌ Builder AI call failed: ${errMsg}`);
    appendLog(ideaId, '⏹️ Halting iteration — the Critic will not run until the Builder succeeds. Check server logs for the full error.');
    status.status = 'failed';
    status.error = `Builder AI failed: ${errMsg}`;
    await saveAgentLoopStatus(ideaId, status);
    return;
  }


  const builderText = builderResponse.choices[0]?.message?.content || '';
  const fileRegex = /@@@ FILE:\s*([a-zA-Z0-9_\-\.\/]+)\r?\n([\s\S]*?)\r?\n@@@ END FILE @@@/g;
  let match;
  const filesUpdatedThisTurn: string[] = [];

  while ((match = fileRegex.exec(builderText)) !== null) {
    const filename = match[1].trim();
    const content = match[2];
    if (filename && validateWorkspaceFilePath(filename)) {
      await writeWorkspaceFile(ideaId, filename, content);
      filesUpdatedThisTurn.push(filename);
      appendLog(ideaId, `✍️ Builder AI updated: ${filename}`);
    }
  }

  if (filesUpdatedThisTurn.length === 0) {
    // Surface a preview of the raw model output so we can diagnose whether the
    // model returned an error/refusal or simply used a different output format.
    const preview = builderText.slice(0, 500).replace(/\s+/g, ' ').trim();
    appendLog(
      ideaId,
      `ℹ️ Builder responded (model: ${MODEL_NAME}) but produced no parseable @@@ FILE blocks. Raw preview: "${preview}${builderText.length > 500 ? '…' : ''}"`
    );
  }

  await executeCriticIteration(ideaId, status, workspacePath, filesUpdatedThisTurn);
}

/**
 * Execute the Critic persona audit and update status/history.
 */
async function executeCriticIteration(
  ideaId: string,
  status: LoopStatus,
  workspacePath: string,
  filesUpdatedThisTurn: string[]
): Promise<void> {
  appendLog(ideaId, '🕵️ Persona B (The Critic) is auditing files...');

  // Bug fix: use in-memory/Firestore file list when Firebase is configured so the
  // Critic gets full file context even when there is no local filesystem (cloud/Vercel).
  const criticStatusData = await getAgentLoopStatus(ideaId);
  const updatedFiles = isFirebaseConfigured
    ? criticStatusData.filesCreated
    : getFilesRecursively(workspacePath).map(f => f.relativePath);
  const criticFilesToSupply = updatedFiles.filter(rel =>
    !rel.startsWith('.') && !rel.startsWith('node_modules/') &&
    rel !== 'agent_loop.js' && rel !== 'kill.lock' &&
    /\.(md|txt|json|js|ts|tsx|html|css)$/.test(rel)
  );

  const criticFileContents: string[] = [];
  for (const file of criticFilesToSupply) {
    const content = await readWorkspaceFile(ideaId, file);
    criticFileContents.push(`### FILE: ${file}\n\`\`\`\n${content}\n\`\`\``);
  }
  // Truncate to prevent token overflows that cause HTTP 500 from the LLM gateway
  const updatedFilesContent = truncateContext(criticFileContents.join('\n\n'));

  const criticPrompt = `You are "The Critic AI", an elite security analyst, business auditor, and technical consensus evaluator.
Your goal is to inspect the software design artifacts and source files in this workspace to ensure they are complete, secure, logically consistent, and fulfill the project's original vision perfectly.

Workspace Files:
${updatedFilesContent}

Critique the workspace meticulously. Check for security vulnerabilities (e.g., OWASP top 10), missing business requirements, incomplete architecture, or gaps in implementation.
If everything is perfect and meets the goal of the project absolutely with no further revisions needed, output the exact phrase: "STATUS: APPROVED"
Otherwise, provide constructive criticisms and detailed step-by-step correction instructions for "The Builder AI" to fix in the next iteration.`;

  let criticResponse;
  try {
    // 110s timeout — same as Builder, leaves headroom before Vercel's 300s limit
    const criticAbort = AbortSignal.timeout(110_000);
    criticResponse = await callAIWithRetry({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You are a rigorous code auditor and business security consultant.' },
        { role: 'user', content: criticPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }, criticAbort);
  } catch (err: unknown) {
    const errMsg = describeAiError(err);
    appendLog(ideaId, `❌ Critic AI call failed: ${errMsg}`);

    appendLog(ideaId, '⏹️ Halting iteration — consensus could not be evaluated. Check server logs for the full error.');
    status.status = 'failed';
    status.error = `Critic AI failed: ${errMsg}`;
    await saveAgentLoopStatus(ideaId, status);
    return;
  }

  const criticText = criticResponse.choices[0]?.message?.content || '';
  appendLog(ideaId, '🕵️ Critic Audit completed. Recommending updates.');

  const iterationHistory = `## Iteration ${status.iteration} Audit & Design Log\n` +
    `**Timestamp:** ${new Date().toLocaleString()}\n` +
    `### Builder Output Summary:\nUpdated files: ${filesUpdatedThisTurn.join(', ') || 'None'}\n\n` +
    `### Critic Review & Recommendation:\n${criticText}\n\n---\n\n`;

  const currentHistoryText = await readWorkspaceFile(ideaId, 'prompthistory.md');
  await writeWorkspaceFile(ideaId, 'prompthistory.md', currentHistoryText + iterationHistory);

  const isApproved = criticText.includes('STATUS: APPROVED');

  if (isApproved) {
    appendLog(ideaId, '🎉 Consensus reached! The Critic AI has officially APPROVED the project specification.');
    status.status = 'completed';
    status.consensusReached = true;

    // Write .clinerules BEFORE saving consensus status so it is guaranteed
    // to be in fileContents when saveAgentLoopStatus persists to Firestore.
    const clinerulesContent = `# Cline Project Implementation Rules\n\nThe specifications for this project have been officially APPROVED by the Critic AI!\n\nYour task is to automatically build out the complete codebase inside this workspace to implement the project described in \`goal.md\` using the approved requirements (\`requirements.md\`) and architecture (\`architecture.md\`).\n\n## 🛠️ Step-by-Step Implementation Instructions\n1. Analyze \`goal.md\`, \`requirements.md\`, and \`architecture.md\` carefully.\n2. Initialize the project (e.g., configure \`package.json\`, set up folders).\n3. Write fully complete, production-ready, highly secure code for all components.\n4. Ensure there are absolutely no placeholders or TODO comments.\n5. Create a verification script or run tests to confirm everything builds and runs perfectly.\n`;
    try {
      await writeWorkspaceFile(ideaId, '.clinerules', clinerulesContent);
      appendLog(ideaId, '📄 Generated .clinerules for Cline integration!');
    } catch (e) {
      appendLog(ideaId, `⚠️ Failed to generate .clinerules: ${e instanceof Error ? e.message : e}`);
    }
    // Bug fix: saveAgentLoopStatus MUST be called in the approved branch too,
    // not just in the else branch. Without this the consensus status and the
    // .clinerules file are never durably persisted to Firestore after approval,
    // so the UI never shows the file and consensusReached never flips in the DB.
    await saveAgentLoopStatus(ideaId, status);
  } else {
    await saveAgentLoopStatus(ideaId, status);
  }
}

/**
 * Execute one iteration of the developer code-writing loop.
 * Used after consensus is reached to build the actual project.
 */
async function executeDeveloperLoopIteration(ideaId: string, status: LoopStatus): Promise<void> {
  appendLog(ideaId, `⚙️ Starting Developer Iteration ${status.iteration + 1} of ${status.maxIterations}...`);

  const workspacePath = getWorkspacePath(ideaId);
  // Use in-memory/Firestore file list when Firebase is configured (cloud/Vercel has no local FS)
  const currentStatusData = await getAgentLoopStatus(ideaId);
  const currentFiles = isFirebaseConfigured
    ? currentStatusData.filesCreated
    : getFilesRecursively(workspacePath).map(f => f.relativePath);
  const filesToSupply = currentFiles.filter(rel =>
    !rel.startsWith('.') && !rel.startsWith('node_modules/') &&
    rel !== 'agent_loop.js' && rel !== 'kill.lock'
  );

  const fileContents: string[] = [];
  for (const file of filesToSupply) {
    const content = await readWorkspaceFile(ideaId, file);
    fileContents.push(`### FILE: ${file}\n\`\`\`\n${content}\n\`\`\``);
  }

  const goalContent = await readWorkspaceFile(ideaId, 'goal.md');
  const devPrompt = `You are "The Builder-Developer AI", an elite full-stack engineer and automation script.
Your task is to write actual WORKING code files inside this local workspace folder to implement the project described in goal.md.

Project Goal:
${goalContent}

Current workspace files:
${fileContents.join('\n\n')}

RULES:
1. Examine the current workspace files.
2. Decide what packages, files, or scripts are required to make this program compile, build, or run correctly.
3. Write actual, production-ready, complete code. Do not use placeholders or write TODOs.
4. Output your file creations or edits using this EXACT syntax:
@@@ FILE: filename.js
[exact content of the file]
@@@ END FILE @@@

5. You can create multiple files in a single turn.`;

  appendLog(ideaId, '🤖 Calling AI Developer to generate/refine code...');

  try {
    const devResponse = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You are an elite developer and software builder. Write complete, production-ready code files. No placeholders.' },
        { role: 'user', content: devPrompt }
      ],
      temperature: 0.2
    });

    const devText = devResponse.choices[0]?.message?.content || '';
    const fileRegex = /@@@ FILE:\s*([a-zA-Z0-9_\-\.\/]+)\r?\n([\s\S]*?)\r?\n@@@ END FILE @@@/g;
    let match;
    const devFilesUpdated: string[] = [];

    while ((match = fileRegex.exec(devText)) !== null) {
      const filename = match[1].trim();
      const content = match[2];
      if (filename && validateWorkspaceFilePath(filename)) {
        await writeWorkspaceFile(ideaId, filename, content);
        devFilesUpdated.push(filename);
        appendLog(ideaId, `✍️ AI Developer created/updated: ${filename}`);
      }
    }

    if (devFilesUpdated.length === 0) {
      appendLog(ideaId, 'ℹ️ AI Developer suggested modifications but didn\'t write formatted file blocks.');
    }

    status.iteration++;
    await saveAgentLoopStatus(ideaId, status);

    if (status.iteration >= status.maxIterations) {
      appendLog(ideaId, '🏁 Developer loop completed. All code files generated.');
      status.status = 'completed';
      await saveAgentLoopStatus(ideaId, status);
    }
  } catch (err: unknown) {
    const errMsg = describeAiError(err);
    appendLog(ideaId, `❌ Error in Developer iteration: ${errMsg}`);
    status.status = 'failed';
    status.error = `Developer AI failed: ${errMsg}`;
    await saveAgentLoopStatus(ideaId, status);
  }
}

export async function runAgentLoop(
  ideaId: string,
  ideaTitle: string,
  ideaDesc: string,
  ideToOpen?: 'vscode' | 'cursor' | 'kiro',
  resume: boolean = false
) {
  if (!validateId(ideaId)) {
    throw new Error('Invalid ID');
  }

  // Reset Abort Controller to ensure clean start (do NOT call stopAgentLoop
  // here as it would fire-and-forget a "stopped" status to Firestore, causing
  // a race condition that pollutes the persisted state with the kill-switch message)
  abortControllers[ideaId] = false;

  // Fresh launch (not a resume): wipe ALL previous state and workspace artifacts
  // so the run truly starts from scratch. A previous unfinished/failed run must
  // not leave behind stale status, files, or audit history.
  if (!resume) {
    await clearAgentLoopWorkspace(ideaId);
    abortControllers[ideaId] = false;
  }

  // Remove any stale kill.lock from previous runs
  const workspacePath = getWorkspacePath(ideaId);

  const killLockPath = path.join(workspacePath, 'kill.lock');
  if (fs.existsSync(killLockPath)) {
    try {
      fs.unlinkSync(killLockPath);
    } catch {}
  }

  const existing = await getAgentLoopStatus(ideaId);
  let iteration = 0;
  let maxIterations = 5;
  let logs: string[] = [];

  if (existing && resume) {
    iteration = existing.iteration;
    maxIterations = iteration + 5;
    // Filter out stale kill-switch entries that may have been persisted in
    // Firestore by a previous fire-and-forget save from stopAgentLoop
    logs = (existing.logs || []).filter(
      log => !log.includes('User Triggered Kill Switch')
    );
  }

  const status: LoopStatus = {
    ideaId,
    status: 'running',
    iteration,
    maxIterations,
    logs,
    ideOpened: existing && resume ? existing.ideOpened : false,
    filesCreated: existing && resume ? existing.filesCreated : [],
    history: existing && resume ? existing.history : '',
    consensusReached: existing && resume ? existing.consensusReached : false,
    // Preserve the full in-memory file contents map so the resumed iteration
    // can still read all previously written workspace files on Vercel (serverless
    // filesystem is ephemeral — fileContents is the only durable source of truth).
    fileContents: existing && resume ? existing.fileContents : undefined,
  };

  // Write the "running" status to memory/Firestore FIRST before any appendLog
  // calls that do fire-and-forget saves, to prevent race conditions
  await saveAgentLoopStatus(ideaId, status);

  if (existing && resume) {
    appendLog(ideaId, `🔄 Resuming Agent Loop. Extending execution by 5 loops (New Max Loops: ${maxIterations}).`);
  } else {
    appendLog(ideaId, `🏁 Initiating AI Agent Loop for project: "${ideaTitle}"`);
  }

  // Re-generate .clinerules if consensus was already reached in a previous run.
  // Always (re-)write it — do not guard with workspaceFileExists — so the file
  // is guaranteed to be present in fileContents even after a Vercel cold-start
  // that wiped the ephemeral in-memory state.
  const isAlreadyApproved = (await readWorkspaceFile(ideaId, 'prompthistory.md')).includes('STATUS: APPROVED');
  if (isAlreadyApproved) {
    status.consensusReached = true;
    const clinerulesContent = `# Cline Project Implementation Rules

The specifications for this project have been officially APPROVED by the Critic AI!

Your task is to automatically build out the complete codebase inside this workspace to implement the project described in \`goal.md\` using the approved requirements (\`requirements.md\`) and architecture (\`architecture.md\`).

## 🛠️ Step-by-Step Implementation Instructions
1. Analyze \`goal.md\`, \`requirements.md\`, and \`architecture.md\` carefully.
2. Initialize the project (e.g., configure \`package.json\`, set up folders).
3. Write fully complete, production-ready, highly secure code for all components.
4. Ensure there are absolutely no placeholders or TODO comments.
5. Create a verification script or run tests to confirm everything builds and runs perfectly.
`;
    try {
      await writeWorkspaceFile(ideaId, '.clinerules', clinerulesContent);
      appendLog(ideaId, `📄 Re-generated .clinerules for Cline integration (consensus was already approved).`);
    } catch (e) {
      appendLog(ideaId, `⚠️ Failed to re-generate .clinerules: ${e instanceof Error ? e.message : e}`);
    }
    await saveAgentLoopStatus(ideaId, status);
  }

  // Generate .vscode/tasks.json for seamless hands-free launch in VS Code/Cursor
  const vscodeDirPath = path.join(workspacePath, '.vscode');
  if (!fs.existsSync(vscodeDirPath)) {
    try {
      fs.mkdirSync(vscodeDirPath, { recursive: true });
    } catch {}
  }

  const tasksJsonContent = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto-Start AI Build Agent",
      "type": "shell",
      "command": "node agent_loop.js",
      "runOptions": {
        "runOn": "folderOpen"
      },
      "presentation": {
        "reveal": "always",
        "panel": "new",
        "focus": true
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}`;

  await writeWorkspaceFile(ideaId, '.vscode/tasks.json', tasksJsonContent);
  appendLog(ideaId, `📄 Generated .vscode/tasks.json for auto-run on folder open`);

  // Generate local .env containing OpenAI credentials for the local agent script to leverage securely
  const apiKey = process.env.OPENAI_API_KEY || '';
  const apiBase = process.env.OPENAI_API_BASE || process.env.API_BASE_URL || 'https://api.openai.com/v1';
  const modelName = process.env.OPENAI_MODEL_NAME || MODEL_NAME;
  const cfClientId = process.env.CF_CLIENT_ID || '';
  const cfClientSecret = process.env.CF_CLIENT_SECRET || '';
  await writeWorkspaceFile(ideaId, '.env', `OPENAI_API_KEY=${apiKey}\nOPENAI_API_BASE=${apiBase}\nOPENAI_MODEL_NAME=${modelName}\nCF_CLIENT_ID=${cfClientId}\nCF_CLIENT_SECRET=${cfClientSecret}\n`);

  // Generate local .gitignore to protect key leaks or node_modules
  const gitignoreContent = `.env\nnode_modules/\nkill.lock\ndist/\nbuild/\n`;
  await writeWorkspaceFile(ideaId, '.gitignore', gitignoreContent);

  // Generate local standalone zero-dependency self-prompting builder runner script
  const agentScriptContent = `const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const readline = require('readline');

// Function to prompt user in terminal
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

// Color helpers for terminal output
const colors = {
  reset: "\\x1b[0m",
  green: "\\x1b[32m",
  yellow: "\\x1b[33m",
  blue: "\\x1b[34m",
  cyan: "\\x1b[36m",
  red: "\\x1b[31m",
  bold: "\\x1b[1m"
};

console.log(\`\${colors.bold}\${colors.cyan}==================================================\${colors.reset}\`);
console.log(\`  🚀 \${colors.bold}\${colors.green}Welcome to the AI Marketplace Local Agent Loop!\${colors.reset}\`);
console.log(\`\${colors.bold}\${colors.cyan}==================================================\${colors.reset}\\n\`);

// 1. Load environment variables
let apiKey = process.env.OPENAI_API_KEY || '';
let apiBase = process.env.OPENAI_API_BASE || process.env.API_BASE_URL || 'https://litellm.deriv.ai/v1';
let modelName = process.env.OPENAI_MODEL_NAME || 'deepseek-v4-pro';
let cfClientId = process.env.CF_CLIENT_ID || '';
let cfClientSecret = process.env.CF_CLIENT_SECRET || '';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'OPENAI_API_KEY') apiKey = val;
      if (key === 'OPENAI_API_BASE') apiBase = val;
      if (key === 'OPENAI_MODEL_NAME') modelName = val;
      if (key === 'CF_CLIENT_ID') cfClientId = val;
      if (key === 'CF_CLIENT_SECRET') cfClientSecret = val;
    }
  });
}

if (!apiKey) {
  console.log(\`\${colors.red}⚠️  Error: OPENAI_API_KEY is not defined in .env! Please configure it to run the agent loop.\${colors.reset}\`);
  process.exit(1);
}

// Ensure lockfiles are cleared on start
if (fs.existsSync('kill.lock')) {
  try { fs.unlinkSync('kill.lock'); } catch(e){}
}

// 2. HTTPS Request Promise wrapper with streaming support
function callAI(messages, onChunk) {
  return new Promise((resolve, reject) => {
    const url = new URL(\`\${apiBase}/chat/completions\`);
    const postData = JSON.stringify({
      model: modelName,
      messages: messages,
      temperature: 0.3,
      stream: true
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Deriv-Agent-Loop/1.0'
    };

    if (cfClientId) {
      headers['CF-Access-Client-Id'] = cfClientId;
    }
    if (cfClientSecret) {
      headers['CF-Access-Client-Secret'] = cfClientSecret;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: headers
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => {
          reject(new Error(\`LLM API returned error status \${res.statusCode}: \${errData}\`));
        });
        return;
      }

      let buffer = '';
      let fullText = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {
              // Ignore partial errors in streams
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer && buffer.startsWith('data: ')) {
          const trimmed = buffer.trim();
          if (trimmed !== 'data: [DONE]') {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {}
          }
        }
        resolve(fullText);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

let spinnerInterval;
function startSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write(message + ' ');
  spinnerInterval = setInterval(() => {
    process.stdout.write(\`\\r\${message} \${colors.cyan}\${frames[i]}\${colors.reset}\`);
    i = (i + 1) % frames.length;
  }, 100);
}

function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\\r\\x1B[K'); // clear the line
  }
}

// Main Runner
async function main() {
  // Pre-flight consensus check with active polling
  let approved = false;
  let printWaitingMsg = true;

  while (!approved) {
    const historyContent = fs.existsSync('prompthistory.md') ? fs.readFileSync('prompthistory.md', 'utf8') : '';
    if (historyContent.includes('STATUS: APPROVED')) {
      approved = true;
    } else {
      if (printWaitingMsg) {
        console.log(\`\\n⏳  \${colors.bold}\${colors.cyan}Waiting for Spec Engine consensus to be APPROVED in the UI...\${colors.reset}\`);
        console.log(\`Keep this terminal open. Once approved, this local code-writing agent will automatically initiate and build the project!\\n\`);
        printWaitingMsg = false;
      }
      // Poll every 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(\`\\n🎉  \${colors.bold}\${colors.green}Consensus APPROVED!\${colors.reset}\`);
  const startAnswer = await askQuestion(\`\\n👉 Would you like the AI Developer to start writing code for the project? (y/n): \`);
  if (startAnswer.trim().toLowerCase() !== 'y' && startAnswer.trim().toLowerCase() !== 'yes') {
    console.log(\`\\n👋  \${colors.yellow}Exiting. AI Developer will not write code at this time.\${colors.reset}\\n\`);
    process.exit(0);
  }
  console.log(\`\\n🚀  \${colors.bold}\${colors.green}Starting Builder-Developer Loop...\${colors.reset}\\n\`);

  const goalContent = fs.existsSync('goal.md') ? fs.readFileSync('goal.md', 'utf8') : 'No goal defined.';
  
  let conversationHistory = [
    {
      role: 'system',
      content: \`You are "The Builder-Developer AI", an elite full-stack engineer and automation script.
Your task is to write actual WORKING code files inside this local workspace folder to implement the project described in goal.md.

RULES:
1. Examine the current workspace files provided by the user.
2. Decide what packages, files, or scripts are required to make this program compile, build, or run correctly.
3. Write actual, production-ready, complete code. Do not use placeholders or write TODOs.
4. Output your file creations or edits using this EXACT syntax:
@@@ FILE: filename.js
[exact content of the file]
@@@ END FILE @@@

5. You can create multiple files in a single turn.

Analyze the goals, create a complete folder structure, write package.json, src files, configs, tests, etc.\`
    }
  ];

  let testErrorLog = "";
  let maxIterations = 5;
  let iteration = 1;
  let running = true;

  while (running && iteration <= maxIterations) {
    // Check for kill switch file
    if (fs.existsSync('kill.lock')) {
      console.log(\`\\n\${colors.red}\${colors.bold}🛑 [Kill-Switch Detected] Stopping the Local Agent Loop immediately.\${colors.reset}\`);
      break;
    }

    console.log(\`\\n\${colors.bold}\${colors.yellow}==================================================\${colors.reset}\`);
    console.log(\`⚙️  \${colors.bold}\${colors.cyan}Local Agent Loop - Iteration \${iteration} of \${maxIterations}\${colors.reset}\`);
    console.log(\`\${colors.bold}\${colors.yellow}==================================================\${colors.reset}\`);

    // Scan workspace files
    const files = fs.readdirSync('.')
      .filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'agent_loop.js' && f !== 'kill.lock');
    
    let currentWorkspaceState = "Current Local Files:\\n";
    files.forEach(file => {
      try {
        const stats = fs.statSync(file);
        if (stats.isFile()) {
          const content = fs.readFileSync(file, 'utf8');
          currentWorkspaceState += \`\\n--- FILE: \${file} ---\\n\${content}\\n--- END FILE ---\\n\`;
        }
      } catch (e) {}
    });

    let iterationPrompt = \`Goal Description:\\n\${goalContent}\\n\\n\${currentWorkspaceState}\`;
    if (testErrorLog) {
      iterationPrompt += \`\\n\\n⚠️ PREVIOUS BUILD/COMPILE ERRORS OR QA CRITIQUE:\\n\${testErrorLog}\\n\\nPlease address and resolve these issues in this iteration!\`;
      testErrorLog = ""; // reset
    }

    conversationHistory.push({ role: 'user', content: iterationPrompt });

    console.log(\`🤖 Calling AI Developer to generate/refine code...\`);
    try {
      startSpinner("Thinking");
      let isFirstChunk = true;
      const responseText = await callAI(conversationHistory, (chunk) => {
        if (isFirstChunk) {
          stopSpinner();
          isFirstChunk = false;
        }
        process.stdout.write(chunk);
      });
      if (isFirstChunk) {
        stopSpinner();
      }
      console.log(); // Print a trailing newline
      conversationHistory.push({ role: 'assistant', content: responseText });

      // Parse file blocks
      const fileRegex = /@@@ FILE:\\s*([a-zA-Z0-9_\\-\\.\\/]+)\\r?\\n([\\s\\S]*?)\\r?\\n@@@ END FILE @@@/g;
      let match;
      let filesUpdated = [];

      while ((match = fileRegex.exec(responseText)) !== null) {
        const filePath = match[1].trim();
        const content = match[2];

        // Ensure subdirectories exist
        const dirPath = path.dirname(filePath);
        if (dirPath && dirPath !== '.' && !fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        filesUpdated.push(filePath);
        console.log(\`✍️  \${colors.green}Created/Updated file:\${colors.reset} \${filePath}\`);
      }

      if (filesUpdated.length === 0) {
        console.log(\`ℹ️  No new code file writes detected in this turn.\`);
      }

      // Auto-build / Compile verification step
      if (fs.existsSync('package.json')) {
        console.log(\`⚙️  package.json found. Running build/compile test...\`);
        try {
          // If node_modules doesn't exist, run npm install first
          if (!fs.existsSync('node_modules')) {
            console.log("📦 Installing npm dependencies...");
            execSync('npm install', { stdio: 'inherit' });
          }
          
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          if (pkg.scripts && pkg.scripts.build) {
            console.log("🛠  Compiling build: running 'npm run build'...");
            execSync('npm run build', { stdio: 'inherit' });
            console.log(\`✅ \${colors.green}Build compiled successfully without errors!\${colors.reset}\`);
          } else {
            console.log("ℹ️  No build script found in package.json. Testing execution with 'node index.js' or main...");
            const mainFile = pkg.main || 'index.js';
            if (fs.existsSync(mainFile)) {
              execSync(\`node -c \${mainFile}\`, { stdio: 'inherit' });
              console.log(\`✅ \${colors.green}Syntax check passed for main file: \${mainFile}\${colors.reset}\`);
            }
          }
        } catch (execErr) {
          console.log(\`\${colors.red}⚠️  Build / Syntax test failed. Logging error for AI correction...\${colors.reset}\`);
          testErrorLog = execErr.message;
        }
      }

      // QA Audit Step
      console.log(\`🕵️  \${colors.bold}\${colors.cyan}Calling AI QA Verifier to audit the implementation...\${colors.reset}\`);
      
      // Rescan workspace state
      const freshFiles = fs.readdirSync('.')
        .filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'agent_loop.js' && f !== 'kill.lock');
      
      let freshWorkspaceState = "Current Local Files:\\n";
      freshFiles.forEach(file => {
        try {
          const stats = fs.statSync(file);
          if (stats.isFile()) {
            const content = fs.readFileSync(file, 'utf8');
            freshWorkspaceState += \`\\n--- FILE: \${file} ---\\n\${content}\\n--- END FILE ---\\n\`;
          }
        } catch (e) {}
      });

      const verifierPrompt = \`You are "The QA Verifier AI", an elite senior code auditor, QA tester, and software security engineer.
Your task is to inspect the codebase generated by the AI Developer and verify if the project is 100% complete, fully functional, secure, compiles perfectly, and meets the high-level goals.

Check for:
1. Security vulnerabilities (input validation, SQL/Command injection, XSS, insecure dependencies).
2. Code quality (clear structure, robust error handling, proper imports/exports, no TODOs/placeholders).
3. Functional completeness (all requirements from goal.md are implemented).
4. Build status (any syntax/compile errors from previous test runs).

Goal Description:
\${goalContent}

Workspace State:
\${freshWorkspaceState}

Build/Compile Status:
\${testErrorLog || 'No build errors.'}

If the project is completely implemented, is fully functional, has absolutely no errors, has zero placeholders/TODOs, and is ready for production, output the exact phrase: "STATUS: VERIFIED"
Otherwise, list the remaining issues, missing features, or bugs that the AI Developer must resolve in the next iteration. Be constructive and highly specific.\`;

      const verifierMessages = [
        { role: 'system', content: 'You are an elite software auditor and QA verifier.' },
        { role: 'user', content: verifierPrompt }
      ];

      startSpinner("Auditing Codebase");
      let isFirstVerifierChunk = true;
      const verifierResponseText = await callAI(verifierMessages, (chunk) => {
        if (isFirstVerifierChunk) {
          stopSpinner();
          isFirstVerifierChunk = false;
        }
        process.stdout.write(chunk);
      });
      if (isFirstVerifierChunk) {
        stopSpinner();
      }
      console.log(); // Trailing newline

      const isVerified = verifierResponseText.includes("STATUS: VERIFIED");

      if (isVerified) {
        if (testErrorLog) {
          console.log(\`\\n⚠️  QA Verifier claimed VERIFIED, but there are build/compile errors. Continuing loop to resolve errors...\`);
        } else {
          console.log(\`\\n🎉 \${colors.bold}\${colors.green}Consensus Achieved! QA Verifier marked the codebase as VERIFIED & COMPLETE!\${colors.reset}\`);
          break;
        }
      } else {
        console.log(\`\\n❌ \${colors.red}Verification Failed. Logging QA feedback for AI Developer correction...\${colors.reset}\`);
        testErrorLog = verifierResponseText;
      }

    } catch (apiErr) {
      stopSpinner();
      console.log(\`\\n\${colors.red}❌ Error calling AI: \${apiErr.message}\${colors.reset}\`);
      break;
    }

    if (iteration === maxIterations) {
      console.log(\`\\n\${colors.bold}\${colors.yellow}⚠️  Local Agent Loop completed \${maxIterations} cycles.\${colors.reset}\`);
      const answer = await askQuestion(\`Would you like to run another 5 cycles to complete building the project? (y/n): \`);
      if (answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes') {
        maxIterations += 5;
        console.log(\`\\n🔄 Extending Agent Loop by another 5 cycles. New limit: \${maxIterations} cycles.\\n\`);
      } else {
        running = false;
      }
    }

    iteration++;
  }

  console.log(\`\\n\${colors.bold}\${colors.cyan}==========================================================\${colors.reset}\`);
  console.log(\`🏁 \${colors.bold}\${colors.green}Agent Loop Finished. Inspect your files in this editor!\${colors.reset}\`);
  console.log(\`\${colors.bold}\${colors.cyan}==================================================\${colors.reset}\\n\`);
}

main().catch(console.error);`;

  await writeWorkspaceFile(ideaId, 'agent_loop.js', agentScriptContent);
  appendLog(ideaId, `📄 Scaffolded zero-dependency builder agent script: agent_loop.js`);

  // Scaffold initial files
  const safeName = ideaTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'ai-project';
  const escapedTitle = ideaTitle.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const escapedDesc = ideaDesc.replace(/"/g, '\\"').replace(/\n/g, ' ');

  const scaffoldFiles = {
    'goal.md': `# High-Level Goals: ${ideaTitle}\n\n${ideaDesc}\n\n## Objective\nTo construct and verify a complete technical blueprint, requirements specification, and architecture blueprint matching the idea's core vision.`,
    'architecture.md': `# Architecture Design Blueprint\n\n*(Pending AI Agent Loop Generation)*`,
    'requirements.md': `# Business & Functional Requirements\n\n*(Pending AI Agent Loop Generation)*`,
    'README.md': `# Workspace: ${ideaTitle}\n\nThis workspace is governed by an automated Critic-Builder loop.\n\n## 🚀 How to Run the Local Code-Writing Agent:\n\nIf your IDE (Cursor or VS Code) blocks automatic background task execution due to Security or Workspace Trust settings, you can easily start the loop manually:\n\n1. Open your integrated terminal in Cursor/VS Code (press \`Ctrl + \\\` \` or \`Cmd + \\\` \`).\n2. Run the following command:\n   \`\`\`bash\n   node agent_loop.js\n   \`\`\`\n3. The AI loop will run directly in your terminal, automatically writing missing code files, installing dependencies, checking syntax, and self-correcting errors!`,
    'package.json': `{\n  "name": "${safeName}",\n  "version": "1.0.0",\n  "description": "${escapedDesc}",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "test": "echo \\"Error: no test specified\\" && exit 0"\n  },\n  "dependencies": {}\n}`,
    'index.js': `// Starter entry point for: ${escapedTitle}\n// Description: ${escapedDesc}\n\nconsole.log("==================================================");\nconsole.log("🚀 Starting ${escapedTitle}...");\nconsole.log("==================================================");\n\nasync function main() {\n  console.log("AI Starter Project successfully initialized!");\n  console.log("Running self-prompting loop to expand features...");\n}\n\nmain().catch(console.error);\n`
  };

  for (const [filename, content] of Object.entries(scaffoldFiles)) {
    if (!(await workspaceFileExists(ideaId, filename))) {
      await writeWorkspaceFile(ideaId, filename, content);
      appendLog(ideaId, `📄 Scaffolded initial file: ${filename}`);
    }
  }

  // Initialize or append prompthistory.md
  const historyContent = await readWorkspaceFile(ideaId, 'prompthistory.md');
  if (historyContent) {
    const sessionHeader = `\n\n# --- Starting Another Loop Cycle (Timestamp: ${new Date().toLocaleString()}) ---\n\n`;
    await writeWorkspaceFile(ideaId, 'prompthistory.md', historyContent + sessionHeader);
    appendLog(ideaId, `📝 Appended loop session header to existing prompthistory.md`);
  } else {
    const initialHistory = `# AI self-prompting Loop History\n**Project:** ${ideaTitle}\n**Launch Timestamp:** ${new Date().toLocaleString()}\n\n---\n\n`;
    await writeWorkspaceFile(ideaId, 'prompthistory.md', initialHistory);
    appendLog(ideaId, `📄 Created fresh prompthistory.md`);
  }

  // Trigger local IDE launch if specified
  if (ideToOpen) {
    launchIDE(ideaId, ideToOpen);
  }

  // Note: We do NOT call runAgentLoopIteration() here.
  // The client fires the first 'iterate' POST immediately after 'start' returns,
  // so running an iteration here would cause Iteration 1 to execute twice:
  // once server-side (here) and once from the first client iterate call.
  // This would cause the Critic AI to be skipped for Iteration 1 in the Live TTY Buffer.
}
