import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { generateRoadmap } from '@/lib/ai/evaluation';

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

    // 1. Check if Roadmap already exists
    const existingRoadmap = await ideasService.getRoadmap(id);
    if (existingRoadmap) {
      return NextResponse.json(existingRoadmap);
    }

    // 2. Fetch idea
    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // 3. Generate Roadmap
    const phases = await generateRoadmap(
      idea.title,
      idea.description,
      idea.expectedBenefits
    );

    // 4. Save Roadmap
    await ideasService.saveRoadmap(id, phases);

    return NextResponse.json({
      ideaId: id,
      phases,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/roadmap:', error);
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

    const phases = await generateRoadmap(
      idea.title,
      idea.description,
      idea.expectedBenefits
    );

    await ideasService.saveRoadmap(id, phases);

    return NextResponse.json({
      ideaId: id,
      phases,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/roadmap:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
