import { NextResponse } from 'next/server';
import {
  getAgentLoopStatus,
  readWorkspaceFile,
  validateId,
  validateWorkspaceFilePath,
} from '@/lib/ai/agent-loop-runner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !validateId(id)) {
      return NextResponse.json({ error: 'Invalid idea ID format' }, { status: 400 });
    }

    const status = await getAgentLoopStatus(id);
    if (!status) {
      return NextResponse.json({ error: 'Agent loop not initialized' }, { status: 404 });
    }

    const filesCreated = status.filesCreated || [];
    const filesMap: Record<string, string> = {};

    for (const filename of filesCreated) {
      if (!validateWorkspaceFilePath(filename)) {
        continue;
      }
      try {
        const content = await readWorkspaceFile(id, filename);
        filesMap[filename] = content;
      } catch {
        filesMap[filename] = '';
      }
    }

    return NextResponse.json({ files: filesMap });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error in GET /api/ideas/[id]/agent-loop/files:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}