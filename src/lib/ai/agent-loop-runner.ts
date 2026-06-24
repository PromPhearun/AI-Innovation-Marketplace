import { openai, MODEL_NAME } from './client';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import os from 'os';

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
}

// In-memory global store to hold loop statuses across API hot-reloads
const globalWithLoops = global as typeof globalThis & {
  _agentLoops?: Record<string, LoopStatus>;
  _abortControllers?: Record<string, boolean>;
};

if (!globalWithLoops._agentLoops) {
  globalWithLoops._agentLoops = {};
}
if (!globalWithLoops._abortControllers) {
  globalWithLoops._abortControllers = {};
}

const agentLoops = globalWithLoops._agentLoops;
const abortControllers = globalWithLoops._abortControllers;

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

export function getAgentLoopStatus(ideaId: string): LoopStatus {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }

  // Ensure workspace folder exists
  const workspacePath = path.join(WORKSPACE_BASE, `idea_${ideaId}`);
  const historyPath = path.join(workspacePath, 'prompthistory.md');
  
  let history = '';
  if (fs.existsSync(historyPath)) {
    history = fs.readFileSync(historyPath, 'utf8');
  }

  let filesCreated: string[] = [];
  if (fs.existsSync(workspacePath)) {
    filesCreated = getFilesRecursively(workspacePath).map(f => f.relativePath);
  }

  const consensusReached = history.includes('STATUS: APPROVED');

  const existing = agentLoops[ideaId];
  if (existing) {
    existing.history = history;
    existing.filesCreated = filesCreated;
    existing.consensusReached = consensusReached;
    return existing;
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

export function stopAgentLoop(ideaId: string) {
  if (!validateId(ideaId)) {
    throw new Error('Invalid Idea ID format');
  }
  abortControllers[ideaId] = true;
  if (agentLoops[ideaId]) {
    agentLoops[ideaId].status = 'stopped';
    agentLoops[ideaId].logs.push('🛑 [User Triggered Kill Switch] Agent Loop stopped immediately.');
  }

  // Also write a kill.lock file in the workspace directory if it exists, to stop any running local terminal agent loop instantly
  const workspacePath = path.join(WORKSPACE_BASE, `idea_${ideaId}`);
  if (fs.existsSync(workspacePath)) {
    try {
      fs.writeFileSync(path.join(workspacePath, 'kill.lock'), 'STOP', 'utf8');
    } catch (e) {
      console.error('Failed to write kill.lock:', e);
    }
  }
}

export function appendLog(ideaId: string, message: string) {
  const status = getAgentLoopStatus(ideaId);
  const timestamp = new Date().toLocaleTimeString();
  status.logs.push(`[${timestamp}] ${message}`);
  console.log(`[AgentLoop ${ideaId}] ${message}`);
}

// Safely open the IDE using standard sanitized environment variables or safe command executions
export function launchIDE(ideaId: string, ide: 'vscode' | 'cursor' | 'kiro'): boolean {
  if (!validateId(ideaId)) {
    return false;
  }

  const workspacePath = path.join(WORKSPACE_BASE, `idea_${ideaId}`);
  
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
      cmd = `cursor "${workspacePath}" "${rootFile}" 2>/dev/null || open -b "com.todesktop.230313mzlgl6u42" "${workspacePath}" "${rootFile}" 2>/dev/null || open -a "Cursor" "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'vscode') {
      cmd = `code "${workspacePath}" "${rootFile}" 2>/dev/null || open -a "Visual Studio Code" "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'kiro') {
      cmd = `open -a "Kiro" "${workspacePath}" "${rootFile}" 2>/dev/null || open "${workspacePath}"`;
    } else {
      cmd = `open "${workspacePath}"`;
    }
  } else if (process.platform === 'win32') {
    if (ide === 'cursor') {
      cmd = `cursor "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'vscode') {
      cmd = `code "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'kiro') {
      cmd = `kiro "${workspacePath}" "${rootFile}" 2>nul || explorer "${workspacePath}"`;
    } else {
      cmd = `explorer "${workspacePath}"`;
    }
  } else {
    // Linux/Other
    if (ide === 'cursor') {
      cmd = `cursor "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'vscode') {
      cmd = `code "${workspacePath}" "${rootFile}"`;
    } else if (ide === 'kiro') {
      cmd = `kiro "${workspacePath}" "${rootFile}" 2>/dev/null || xdg-open "${workspacePath}"`;
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

  // Stop any running loop first
  stopAgentLoop(ideaId);
  
  // Reset Abort Controller
  abortControllers[ideaId] = false;

  const existing = agentLoops[ideaId];
  let iteration = 0;
  let maxIterations = 5;
  let logs: string[] = [];

  if (existing && resume) {
    iteration = existing.iteration;
    maxIterations = iteration + 5;
    logs = [...existing.logs];
  }

  const status: LoopStatus = agentLoops[ideaId] = {
    ideaId,
    status: 'running',
    iteration,
    maxIterations,
    logs,
    ideOpened: existing && resume ? existing.ideOpened : false,
    filesCreated: existing && resume ? existing.filesCreated : [],
    history: existing && resume ? existing.history : ''
  };

  if (existing && resume) {
    appendLog(ideaId, `🔄 Resuming Agent Loop. Extending execution by 5 cycles (New Max Cycles: ${maxIterations}).`);
  } else {
    appendLog(ideaId, `🏁 Initiating AI Agent Loop for project: "${ideaTitle}"`);
  }

  // Ensure workspace exists
  const workspacePath = path.join(WORKSPACE_BASE, `idea_${ideaId}`);
  if (!fs.existsSync(WORKSPACE_BASE)) {
    fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
  }
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
    appendLog(ideaId, `📁 Created workspace directory: ./agent_workspace/idea_${ideaId}`);
  }

  // Generate .clinerules if consensus was already reached previously
  const historyPath = path.join(workspacePath, 'prompthistory.md');
  const isAlreadyApproved = fs.existsSync(historyPath) && fs.readFileSync(historyPath, 'utf8').includes('STATUS: APPROVED');
  if (isAlreadyApproved) {
    status.consensusReached = true;
    const clinerulesPath = path.join(workspacePath, '.clinerules');
    if (!fs.existsSync(clinerulesPath)) {
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
        fs.writeFileSync(clinerulesPath, clinerulesContent, 'utf8');
        appendLog(ideaId, `📄 Generated .clinerules for Cline integration!`);
      } catch {}
    }
  }

  // Ensure we delete any existing kill-switch lock on fresh loop start
  const killLockPath = path.join(workspacePath, 'kill.lock');
  if (fs.existsSync(killLockPath)) {
    try {
      fs.unlinkSync(killLockPath);
    } catch {}
  }

  // Generate .vscode/tasks.json for seamless hands-free launch in VS Code/Cursor
  const vscodeDirPath = path.join(workspacePath, '.vscode');
  if (!fs.existsSync(vscodeDirPath)) {
    fs.mkdirSync(vscodeDirPath, { recursive: true });
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

  fs.writeFileSync(path.join(vscodeDirPath, 'tasks.json'), tasksJsonContent, 'utf8');
  appendLog(ideaId, `📄 Generated .vscode/tasks.json for auto-run on folder open`);

  // Generate local .env containing OpenAI credentials for the local agent script to leverage securely
  const apiKey = process.env.OPENAI_API_KEY || '';
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  fs.writeFileSync(path.join(workspacePath, '.env'), `OPENAI_API_KEY=${apiKey}\nOPENAI_API_BASE=${apiBase}\n`, 'utf8');

  // Generate local .gitignore to protect key leaks or node_modules
  const gitignoreContent = `.env\nnode_modules/\nkill.lock\ndist/\nbuild/\n`;
  fs.writeFileSync(path.join(workspacePath, '.gitignore'), gitignoreContent, 'utf8');

  // Generate local standalone zero-dependency self-prompting builder runner script
  const agentScriptContent = `const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

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
let apiKey = '';
let apiBase = 'https://api.openai.com/v1';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'OPENAI_API_KEY') apiKey = val;
      if (key === 'OPENAI_API_BASE') apiBase = val;
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

// 2. HTTPS Request Promise wrapper
function callAI(messages) {
  return new Promise((resolve, reject) => {
    const url = new URL(\`\${apiBase}/chat/completions\`);
    const postData = JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.3
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices[0].message.content);
          } catch (e) {
            reject(new Error(\`Failed to parse LLM JSON: \${e.message}\`));
          }
        } else {
          reject(new Error(\`LLM API returned error status \${res.statusCode}: \${data}\`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main Runner
async function main() {
  // Pre-flight consensus check
  const historyContent = fs.existsSync('prompthistory.md') ? fs.readFileSync('prompthistory.md', 'utf8') : '';
  if (!historyContent.includes('STATUS: APPROVED')) {
    console.log(\`\\n\${colors.red}\${colors.bold}⚠️  Access Denied: Specifications must be APPROVED first!\${colors.reset}\`);
    console.log(\`Please run the Spec Engine in the UI first until Persona B (The Critic) approves the specification.\`);
    console.log(\`Once approved, consensus is officially reached, and this local code-writing agent will run.\\n\`);
    process.exit(1);
  }

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
<<<< FILE: filename.js
[exact content of the file]
>>>>

5. You can create multiple files in a single turn.
6. When the codebase is fully implemented, error-free, and compiles perfectly, end your response with the exact phrase: "STATUS: COMPLETE"

Analyze the goals, create a complete folder structure, write package.json, src files, configs, tests, etc.\`
    }
  ];

  let testErrorLog = "";

  for (let iteration = 1; iteration <= 5; iteration++) {
    // Check for kill switch file
    if (fs.existsSync('kill.lock')) {
      console.log(\`\\n\${colors.red}\${colors.bold}🛑 [Kill-Switch Detected] Stopping the Local Agent Loop immediately.\${colors.reset}\`);
      break;
    }

    console.log(\`\\n\${colors.bold}\${colors.yellow}==================================================\${colors.reset}\`);
    console.log(\`⚙️  \${colors.bold}\${colors.cyan}Local Agent Loop - Iteration \${iteration} of 5\${colors.reset}\`);
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
      iterationPrompt += \`\\n\\n⚠️ PREVIOUS BUILD/COMPILE ERRORS:\\n\${testErrorLog}\\n\\nPlease fix these compilation/build errors in this iteration!\`;
      testErrorLog = ""; // reset
    }

    conversationHistory.push({ role: 'user', content: iterationPrompt });

    console.log(\`🤖 Calling AI Developer to generate/refine code...\\n\`);
    try {
      const responseText = await callAI(conversationHistory);
      conversationHistory.push({ role: 'assistant', content: responseText });

      // Parse file blocks
      const fileRegex = /<<<< FILE:\\s*([a-zA-Z0-9_\\-\\.\\/]+)\\n([\\s\\S]*?)\\n>>>>/g;
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

      // Check if complete
      if (responseText.includes("STATUS: COMPLETE")) {
        console.log(\`\\n🎉 \${colors.bold}\${colors.green}Consensus Achieved! AI Developer marked the code as COMPLETE!\${colors.reset}\`);
        break;
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

    } catch (apiErr) {
      console.log(\`\${colors.red}❌ Error calling AI: \${apiErr.message}\${colors.reset}\`);
      break;
    }
  }

  console.log(\`\\n\${colors.bold}\${colors.cyan}==================================================\${colors.reset}\`);
  console.log(\`🏁 \${colors.bold}\${colors.green}Agent Loop Finished. Inspect your files in this editor!\${colors.reset}\`);
  console.log(\`\${colors.bold}\${colors.cyan}==================================================\${colors.reset}\\n\`);
}

main().catch(console.error);`;

  fs.writeFileSync(path.join(workspacePath, 'agent_loop.js'), agentScriptContent, 'utf8');
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
    const filePath = path.join(workspacePath, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf8');
      appendLog(ideaId, `📄 Scaffolded initial file: ${filename}`);
    }
  }

  // Initialize or append prompthistory.md
  if (fs.existsSync(historyPath)) {
    const sessionHeader = `\n\n# --- Starting Another Loop Cycle (Timestamp: ${new Date().toLocaleString()}) ---\n\n`;
    fs.appendFileSync(historyPath, sessionHeader, 'utf8');
    appendLog(ideaId, `📝 Appended loop session header to existing prompthistory.md`);
  } else {
    const initialHistory = `# AI self-prompting Loop History\n**Project:** ${ideaTitle}\n**Launch Timestamp:** ${new Date().toLocaleString()}\n\n---\n\n`;
    fs.writeFileSync(historyPath, initialHistory, 'utf8');
    appendLog(ideaId, `📄 Created fresh prompthistory.md`);
  }

  // Trigger local IDE launch if specified
  if (ideToOpen) {
    launchIDE(ideaId, ideToOpen);
  }

  // Start background loop runner process
  void (async () => {
    try {
      while (status.iteration < status.maxIterations) {
        if (abortControllers[ideaId]) {
          appendLog(ideaId, `🛑 Agent Loop execution stopped by user.`);
          status.status = 'stopped';
          return;
        }

        status.iteration++;
        appendLog(ideaId, `🔄 Starting Iteration ${status.iteration} of ${status.maxIterations}`);

        // Read all current files (recursively) to supply as context
        const currentFilesContent = getFilesRecursively(workspacePath)
          .filter(f => f.relativePath.endsWith('.md') || f.relativePath.endsWith('.txt') || f.relativePath.endsWith('.json') || f.relativePath.endsWith('.py') || f.relativePath.endsWith('.js') || f.relativePath.endsWith('.ts'))
          .map(f => {
            const content = fs.readFileSync(f.absolutePath, 'utf8');
            return `### FILE: ${f.relativePath}\n\`\`\`\n${content}\n\`\`\``;
          })
          .join('\n\n');

        // Step 1: BUILDER PERSONA
        appendLog(ideaId, `🤖 Persona A (The Builder) is drafting updates...`);
        const builderPrompt = `You are "The Builder AI", an expert software architect, requirements engineer, and software developer.
Your goal is to build out a complete, production-grade technical design, requirements specification, and architecture blueprint inside this workspace to fulfill:
Project Title: ${ideaTitle}
Project Goal: ${ideaDesc}

Here is the current state of files in the workspace:
${currentFilesContent}

Analyze these files and any critique provided previously. Rewrite or add content to these files to make them complete, robust, and professional.
Specify the exact file paths and file contents that need to be created or overwritten.

You MUST format your output as a series of instructions containing the file contents to write, like this:
<<<< FILE: filename.md
[New file content here]
>>>>

Ensure you cover architecture, API specs, database schemes, folder layouts, and requirements. Write actual, highly-specific content rather than placeholders.`;

        const builderResponse = await openai.chat.completions.create({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are an elite developer and software builder.' },
            { role: 'user', content: builderPrompt }
          ],
          temperature: 0.2
        });

        const builderText = builderResponse.choices[0]?.message?.content || '';

        // Parse and apply files written by the Builder (allowing subdirectories)
        const fileRegex = /<<<< FILE:\s*([a-zA-Z0-9_\-\.\/]+)\n([\s\S]*?)\n>>>>/g;
        let match;
        const filesUpdatedThisTurn: string[] = [];

        while ((match = fileRegex.exec(builderText)) !== null) {
          const filename = match[1].trim();
          const content = match[2];
          
          if (filename && validateWorkspaceFilePath(filename)) {
            const fullPath = path.join(workspacePath, filename);
            const dirPath = path.dirname(fullPath);
            if (dirPath && !fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(fullPath, content, 'utf8');
            filesUpdatedThisTurn.push(filename);
            appendLog(ideaId, `✍️ Builder AI updated: ${filename}`);
          } else if (filename) {
            appendLog(ideaId, `⚠️ Blocked write of invalid or unsafe file path: ${filename}`);
          }
        }

        if (filesUpdatedThisTurn.length === 0) {
          appendLog(ideaId, `ℹ️ Builder suggested modifications but didn't write formatted file blocks. Saving output to raw logs.`);
        }

        // Step 2: CRITIC PERSONA
        appendLog(ideaId, `🕵️ Persona B (The Critic) is auditing files against targets...`);
        
        // Reload files content (recursively) to give to the Critic
        const updatedFilesContent = getFilesRecursively(workspacePath)
          .filter(f => f.relativePath.endsWith('.md') || f.relativePath.endsWith('.txt') || f.relativePath.endsWith('.json') || f.relativePath.endsWith('.py') || f.relativePath.endsWith('.js') || f.relativePath.endsWith('.ts'))
          .map(f => {
            const content = fs.readFileSync(f.absolutePath, 'utf8');
            return `### FILE: ${f.relativePath}\n\`\`\`\n${content}\n\`\`\``;
          })
          .join('\n\n');

        const criticPrompt = `You are "The Critic AI", an elite security analyst, business auditor, and technical consensus evaluator.
Your goal is to inspect the software design artifacts and source files in this workspace to ensure they are complete, secure, logically consistent, and fulfill the project's original vision perfectly.

Workspace Files:
${updatedFilesContent}

Critique the workspace meticulously. Check for security vulnerabilities (e.g., OWASP top 10), missing business requirements, incomplete architecture, or gaps in implementation.
If everything is perfect and meets the goal of the project absolutely with no further revisions needed, output the exact phrase: "STATUS: APPROVED".
Otherwise, provide constructive criticisms and detailed step-by-step correction instructions for "The Builder AI" to fix in the next iteration.`;

        const criticResponse = await openai.chat.completions.create({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: 'You are a rigorous code auditor and business security consultant.' },
            { role: 'user', content: criticPrompt }
          ],
          temperature: 0.1
        });

        const criticText = criticResponse.choices[0]?.message?.content || '';
        appendLog(ideaId, `🕵️ Critic Audit completed. Recommending updates.`);

        const isApproved = criticText.includes('STATUS: APPROVED');

        // Record history
        const iterationHistory = `## Iteration ${status.iteration} Audit & Design Log\n` +
          `**Timestamp:** ${new Date().toLocaleString()}\n` +
          `### Builder Output Summary:\nUpdated files: ${filesUpdatedThisTurn.join(', ') || 'None'}\n\n` +
          `### Critic Review & Recommendation:\n${criticText}\n\n` +
          `---\n\n`;

        fs.appendFileSync(historyPath, iterationHistory, 'utf8');

        if (isApproved) {
          appendLog(ideaId, `🎉 Consensus reached! The Critic AI has officially APPROVED the project specification.`);
          status.status = 'completed';
          status.consensusReached = true;

          // Generate .clinerules to guide Cline
          const clinerulesPath = path.join(workspacePath, '.clinerules');
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
            fs.writeFileSync(clinerulesPath, clinerulesContent, 'utf8');
            appendLog(ideaId, `📄 Generated .clinerules for Cline integration!`);
          } catch (e) {
            appendLog(ideaId, `⚠️ Failed to generate .clinerules: ${e instanceof Error ? e.message : e}`);
          }

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
<<<< FILE: filename.js
[exact content of the file]
>>>>

5. You can create multiple files in a single turn.
6. When the codebase is fully implemented, error-free, and compiles perfectly, end your response with the exact phrase: "STATUS: COMPLETE"

Analyze the goals, create a complete folder structure, write package.json, src files, configs, tests, etc.`
            }
          ];

          let devErrorLog = '';

          for (let devIter = 1; devIter <= 5; devIter++) {
            if (abortControllers[ideaId]) {
              appendLog(ideaId, `🛑 Developer loop execution stopped by user.`);
              status.status = 'stopped';
              return;
            }

            appendLog(ideaId, `⚙️ Starting Developer Iteration ${devIter} of 5...`);

            // Read all current files recursively for context
            const currentFiles = getFilesRecursively(workspacePath);
            const filesContext = currentFiles
              .filter(f => {
                const rel = f.relativePath;
                return !rel.startsWith('.') &&
                  !rel.startsWith('node_modules/') &&
                  rel !== 'agent_loop.js' &&
                  rel !== 'kill.lock' &&
                  (rel.endsWith('.md') || rel.endsWith('.txt') || rel.endsWith('.json') || rel.endsWith('.js') || rel.endsWith('.ts') || rel.endsWith('.tsx') || rel.endsWith('.html') || rel.endsWith('.css'));
              })
              .map(f => {
                const content = fs.readFileSync(f.absolutePath, 'utf8');
                return `### FILE: ${f.relativePath}\n\`\`\`\n${content}\n\`\`\``;
              })
              .join('\n\n');

            let devPrompt = `Goal Description:\n${ideaDesc}\n\n${filesContext}`;
            if (devErrorLog) {
              devPrompt += `\n\n⚠️ PREVIOUS BUILD/COMPILE ERRORS:\n${devErrorLog}\n\nPlease fix these compilation/build errors in this iteration!`;
              devErrorLog = ''; // reset
            }

            devHistory.push({ role: 'user', content: devPrompt });
            appendLog(ideaId, `🤖 Calling AI Developer to generate/refine code...`);

            try {
              const devResponse = await openai.chat.completions.create({
                model: MODEL_NAME,
                messages: devHistory,
                temperature: 0.3
              });

              const devText = devResponse.choices[0]?.message?.content || '';
              devHistory.push({ role: 'assistant', content: devText });

              // Parse and write file blocks
              const devFileRegex = /<<<< FILE:\s*([a-zA-Z0-9_\-\.\/]+)\n([\s\S]*?)\n>>>>/g;
              let devMatch;
              const devFilesUpdated: string[] = [];

              while ((devMatch = devFileRegex.exec(devText)) !== null) {
                const filename = devMatch[1].trim();
                const content = devMatch[2];

                if (filename && validateWorkspaceFilePath(filename)) {
                  const fullPath = path.join(workspacePath, filename);
                  const dirPath = path.dirname(fullPath);
                  if (dirPath && !fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                  }
                  fs.writeFileSync(fullPath, content, 'utf8');
                  devFilesUpdated.push(filename);
                  appendLog(ideaId, `✍️ AI Developer created/updated: ${filename}`);
                } else if (filename) {
                  appendLog(ideaId, `⚠️ Blocked write of invalid or unsafe file path: ${filename}`);
                }
              }

              if (devFilesUpdated.length === 0) {
                appendLog(ideaId, `ℹ️ AI Developer suggested modifications but didn't write formatted file blocks.`);
              }

              if (devText.includes('STATUS: COMPLETE')) {
                appendLog(ideaId, `🎉 AI Developer marked the code implementation as COMPLETE!`);
                break;
              }

              // Run tests/compilation check inside workspace locally
              const localPackageJsonPath = path.join(workspacePath, 'package.json');
              if (fs.existsSync(localPackageJsonPath)) {
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

            } catch (devErr: unknown) {
              const errMessage = devErr instanceof Error ? devErr.message : String(devErr);
              appendLog(ideaId, `❌ Error calling AI Developer in iteration ${devIter}: ${errMessage}`);
            }
          }

          appendLog(ideaId, `🎉 Developer loop completed successfully.`);

          if (ideToOpen) {
            launchIDE(ideaId, ideToOpen);
          }
          return;
        }
      }

      appendLog(ideaId, `🏁 Max iterations (${status.maxIterations}) completed. specifications generated.`);
      status.status = 'completed';
    } catch (err: unknown) {
      const error = err as Error;
      appendLog(ideaId, `❌ Error in Agent Loop execution: ${error?.message || error}`);
      status.status = 'failed';
      status.error = error?.message || 'Unknown runner error';
    }
  })();
}
