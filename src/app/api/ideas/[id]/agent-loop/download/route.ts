import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { validateId } from '@/lib/ai/agent-loop-runner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !validateId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const WORKSPACE_BASE = path.join(process.cwd(), 'agent_workspace');
    const workspacePath = path.join(WORKSPACE_BASE, `idea_${id}`);

    if (!fs.existsSync(workspacePath)) {
      return NextResponse.json({ error: 'Workspace folder not found. Please run the AI Agent Loop first!' }, { status: 404 });
    }

    // Determine temporary path for output archive
    const zipFilename = `idea_${id}_workspace.zip`;
    const tempZipPath = path.join(WORKSPACE_BASE, zipFilename);

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

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="idea_${id}_workspace.tar.gz"`,
        },
      });
    }

    // If zip was successful
    if (!fs.existsSync(tempZipPath)) {
      return NextResponse.json({ error: 'Failed to generate archive.' }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(tempZipPath);
    fs.unlinkSync(tempZipPath); // cleanup

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error in GET /api/ideas/[id]/agent-loop/download:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to download workspace archive' },
      { status: 500 }
    );
  }
}
