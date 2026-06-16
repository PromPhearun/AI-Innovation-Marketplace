import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';

export async function GET(
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
    const comments = await ideasService.getComments(id);
    const votes = await ideasService.getVotes(id);
    const summary = await ideasService.getSummary(id);

    return NextResponse.json({
      idea,
      reviews,
      comments,
      votes,
      summary,
    });
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
