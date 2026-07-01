import { NextResponse } from 'next/server';
import { validateId, getAgentLoopStatus, readWorkspaceFile } from '@/lib/ai/agent-loop-runner';
// Pure-JS zip — no native binaries required (works on Vercel Lambda where zip/tar are unavailable)
import JSZip from 'jszip';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation — prevent path traversal / command injection
    if (!id || typeof id !== 'string' || !validateId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const status = await getAgentLoopStatus(id);

    // Disable downloading until Builder-Critic consensus has been reached
    if (!status.consensusReached) {
      return NextResponse.json(
        { error: 'Workspace Spec Archive cannot be downloaded until Builder-Critic consensus is officially reached.' },
        { status: 403 }
      );
    }

    const filesCreated = status.filesCreated || [];

    if (filesCreated.length === 0) {
      return NextResponse.json(
        { error: 'No workspace files found. Please run the Agent Loop first.' },
        { status: 404 }
      );
    }

    // Build zip archive entirely in memory — no native binaries needed
    const zip = new JSZip();

    for (const filename of filesCreated) {
      try {
        const content = await readWorkspaceFile(id, filename);
        if (content !== undefined && content !== null) {
          // Add file at the correct sub-path within the zip
          zip.file(filename, content);
        }
      } catch (err) {
        console.error(`[download] Error reading workspace file "${filename}":`, err);
        // Skip unreadable files gracefully rather than failing the whole download
      }
    }

    // Generate the zip buffer — use Uint8Array so it's assignable to the Web API
    // Response BodyInit type (Buffer is a Node.js type and causes a TS mismatch
    // in Next.js App Router route handlers which expect Web API types).
    const zipBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `idea_${id}_workspace.zip`;

    // Copy into a plain ArrayBuffer to satisfy the Web API Response BodyInit type.
    // (Uint8Array.buffer can be a SharedArrayBuffer which is not assignable to BodyInit.)
    const zipArrayBuffer = zipBuffer.buffer instanceof ArrayBuffer
      ? zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength)
      : new Uint8Array(zipBuffer).buffer;

    return new Response(zipArrayBuffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error in GET /api/ideas/[id]/agent-loop/download:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate workspace archive' },
      { status: 500 }
    );
  }
}
