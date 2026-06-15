import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { calculateSimilarity } from '@/lib/ai/similarity';

export async function POST(request: Request) {
  try {
    const { title, description } = await request.json();

    if (!title && !description) {
      return NextResponse.json(
        { error: 'At least title or description is required for checking similarity' },
        { status: 400 }
      );
    }

    // Fetch all existing ideas
    const existingIdeas = await ideasService.getIdeas();

    // Calculate similarities
    const similarIdeas = calculateSimilarity(title || '', description || '', existingIdeas);

    return NextResponse.json({
      similarIdeas,
      hasDuplicateWarning: similarIdeas.some(item => item.score >= 50), // trigger warning if 50%+ similarity
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas/similarity:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
