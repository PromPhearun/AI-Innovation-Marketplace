import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import {
  getAgentLoopStatus,
  runAgentLoop,
  stopAgentLoop,
  validateId,
  launchIDE,
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
    return NextResponse.json(status);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error in GET /api/ideas/[id]/agent-loop:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !validateId(id)) {
      return NextResponse.json({ error: 'Invalid idea ID format' }, { status: 400 });
    }

    const body = await request.json();
    const { action, ide } = body;

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (action === 'start') {
      const resume = !!body.resume;
      await runAgentLoop(id, idea.title, idea.description, ide, resume);
      const status = await getAgentLoopStatus(id);
      return NextResponse.json({ message: 'Agent Loop started', status });
    } else if (action === 'stop') {
      stopAgentLoop(id);
      const status = await getAgentLoopStatus(id);
      return NextResponse.json({ message: 'Agent Loop stopped', status });
    } else if (action === 'launch_ide') {
      const targetIde = ide || 'vscode';
      const success = launchIDE(id, targetIde);
      const status = await getAgentLoopStatus(id);
      return NextResponse.json({ message: success ? 'IDE opened' : 'Failed to open IDE or skipped', status });
    } else {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error in POST /api/ideas/[id]/agent-loop:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
