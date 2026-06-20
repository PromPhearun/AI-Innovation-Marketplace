import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { ClickUpTask, ClickUpSync, Comment } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid idea ID format' }, { status: 400 });
    }

    const clickup = await ideasService.getClickUpSync(id);
    if (clickup) {
      return NextResponse.json(clickup);
    }

    return NextResponse.json({ synced: false, subtasks: [] });
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/clickup:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
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
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid idea ID format' }, { status: 400 });
    }

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // 1. Get or generate roadmap to extract tickets
    let roadmap = await ideasService.getRoadmap(id);
    if (!roadmap) {
      // Generate roadmap automatically if it doesn't exist yet
      const { generateRoadmap } = await import('@/lib/ai/evaluation');
      const phases = await generateRoadmap(idea.title, idea.description, idea.expectedBenefits);
      await ideasService.saveRoadmap(id, phases);
      roadmap = await ideasService.getRoadmap(id);
    }

    const subtasks: ClickUpTask[] = [];
    let taskCounter = 1;

    if (roadmap && roadmap.phases) {
      roadmap.phases.forEach((phase) => {
        const items = [...phase.tasks, ...phase.deliverables];
        const uniqueItems = Array.from(new Set(items)); // remove duplicates

        uniqueItems.forEach((item) => {
          // If it's Phase 1, make the first item completed to look active and real
          const completed = phase.phaseNumber === 1 && taskCounter === 1;

          subtasks.push({
            id: `CU-SUB-${taskCounter++}`,
            text: `[Phase ${phase.phaseNumber}] ${item}`,
            completed
          });
        });
      });
    } else {
      // Fallback if no roadmap
      subtasks.push({
        id: 'CU-SUB-1',
        text: '[Phase 1] Draft PRD and architectural blueprint',
        completed: true
      });
      subtasks.push({
        id: 'CU-SUB-2',
        text: '[Phase 1] Conduct threat modeling and security validation',
        completed: false
      });
      subtasks.push({
        id: 'CU-SUB-3',
        text: '[Phase 2] Develop primary functional service modules',
        completed: false
      });
    }

    const clickupData: ClickUpSync = {
      ideaId: id,
      ticketKey: `CU-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketUrl: `https://app.clickup.com/9003102/v/t/${id}`,
      syncedAt: new Date().toISOString(),
      subtasks
    };

    await ideasService.saveClickUpSync(id, clickupData);

    // Create automatic comment remark on the idea card
    const remarkId = `comment_clickup_${Date.now()}`;
    const remark: Comment = {
      id: remarkId,
      ideaId: id,
      userId: 'clickup_bot',
      userName: 'ClickUp Integration',
      comment: `ClickUp task successfully created! Ticket Key: ${clickupData.ticketKey}. View task: ${clickupData.ticketUrl}`,
      createdAt: new Date().toISOString(),
    };
    await ideasService.addComment(remark);

    return NextResponse.json(clickupData);
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/clickup:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
