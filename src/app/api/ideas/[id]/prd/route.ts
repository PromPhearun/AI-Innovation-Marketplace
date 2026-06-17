import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';
import { generatePRD } from '@/lib/ai/evaluation';

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

    // 1. Check if PRD already exists
    const existingPRD = await ideasService.getPRD(id);
    if (existingPRD) {
      return NextResponse.json(existingPRD);
    }

    // 2. Fetch idea and reviews to generate PRD
    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const reviews = await reviewsService.getReviews(id);

    // 3. Generate PRD
    const markdown = await generatePRD(
      idea.title,
      idea.description,
      idea.expectedBenefits,
      reviews
    );

    // 4. Save PRD
    await ideasService.savePRD(id, markdown);

    return NextResponse.json({
      ideaId: id,
      markdown,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/prd:', error);
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

    const reviews = await reviewsService.getReviews(id);

    const markdown = await generatePRD(
      idea.title,
      idea.description,
      idea.expectedBenefits,
      reviews
    );

    await ideasService.savePRD(id, markdown);

    return NextResponse.json({
      ideaId: id,
      markdown,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/prd:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
