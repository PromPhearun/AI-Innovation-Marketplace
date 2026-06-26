import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { validateId, getAgentLoopStatus, readWorkspaceFile, getWorkspacePath } from '@/lib/ai/agent-loop-runner';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let tempDir = '';
  let isTemp = false;
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !validateId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

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
    let workspacePath = getWorkspacePath(id);

    const status = await getAgentLoopStatus(id);

    // Disable downloading if Builder-Critic consensus has not been reached
    if (!status.consensusReached) {
      return NextResponse.json(
        { error: 'Workspace Spec Archive cannot be downloaded until Builder-Critic consensus is officially reached.' },
        { status: 403 }
      );
    }

    const filesCreated = status.filesCreated || [];

    if (isFirebaseConfigured && filesCreated.length > 0) {
      try {
        tempDir = path.join(os.tmpdir(), `idea_${id}_download_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        for (const filename of filesCreated) {
          try {
            const content = await readWorkspaceFile(id, filename);
            if (content) {
              const destPath = path.join(tempDir, filename);
              const destDir = path.dirname(destPath);
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              fs.writeFileSync(destPath, content, 'utf8');
            }
          } catch (err) {
            console.error(`Error downloading file ${filename} for zip:`, err);
          }
        }
        workspacePath = tempDir;
        isTemp = true;
      } catch (err) {
        console.error('Error preparing temp directory for zip download:', err);
      }
    }

    if (!isTemp && !fs.existsSync(workspacePath)) {
      return NextResponse.json({ error: 'Workspace folder not found. Please run the AI Agent Loop first!' }, { status: 404 });
    }

    // Determine temporary path for output archive
    const zipFilename = `idea_${id}_workspace.zip`;
    const tempZipPath = path.join(isTemp ? os.tmpdir() : WORKSPACE_BASE, zipFilename);

    // If file exists, delete it first
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    // Try executing native zip command
    try {
      execSync(`cd "${workspacePath}" && zip -r "${tempZipPath}" . -x "*.zip"`);
    } catch (zipError) {
      console.warn('Native zip command failed, falling back to tar:', zipError);
      // Fallback: Try generating a .tar.gz archive which is supported in any Vercel/Linux container
      const tarFilename = `idea_${id}_workspace.tar.gz`;
      const tempTarPath = path.join(WORKSPACE_BASE, tarFilename);
      if (fs.existsSync(tempTarPath)) fs.unlinkSync(tempTarPath);

      execSync(`cd "${workspacePath}" && tar -czf "${tempTarPath}" .`);
      
      if (!fs.existsSync(tempTarPath)) {
        throw new Error('All compression utilities (zip, tar) failed to execute.');
      }

      const fileBuffer = fs.readFileSync(tempTarPath);
      fs.unlinkSync(tempTarPath); // cleanup

      if (isTemp && tempDir) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="idea_${id}_workspace.tar.gz"`,
        },
      });
    }

    // If zip was successful
    if (!fs.existsSync(tempZipPath)) {
      if (isTemp && tempDir) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
      return NextResponse.json({ error: 'Failed to generate archive.' }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(tempZipPath);
    fs.unlinkSync(tempZipPath); // cleanup

    if (isTemp && tempDir) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error: unknown) {
    if (isTemp && tempDir) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
    const err = error as Error;
    console.error('API Error in GET /api/ideas/[id]/agent-loop/download:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to download workspace archive' },
      { status: 500 }
    );
  }
}
