import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';
import { generateExecutiveSummary } from '@/lib/ai/evaluation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Check if summary already exists
    const existingSummary = await ideasService.getSummary(id);
    if (existingSummary) {
      return NextResponse.json(existingSummary);
    }

    // 2. Fetch idea and reviews to generate summary
    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const reviews = await reviewsService.getReviews(id);

    // 3. Generate summary
    const summaryText = await generateExecutiveSummary(
      idea.title,
      idea.description,
      idea.expectedBenefits,
      reviews
    );

    // 4. Save summary
    await ideasService.saveSummary(id, summaryText);

    return NextResponse.json({
      ideaId: id,
      summary: summaryText,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/summarize:', error);
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

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const reviews = await reviewsService.getReviews(id);

    const summaryText = await generateExecutiveSummary(
      idea.title,
      idea.description,
      idea.expectedBenefits,
      reviews
    );

    await ideasService.saveSummary(id, summaryText);

    return NextResponse.json({
      ideaId: id,
      summary: summaryText,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/summarize:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
