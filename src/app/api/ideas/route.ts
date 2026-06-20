import { NextResponse } from 'next/server';
import { ideaSchema } from '@/utils/schemas';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';
import { evaluateIdea } from '@/lib/ai/evaluation';
import { Idea, AIReview } from '@/types';

export async function GET() {
  try {
    const [ideas, votes, clickups, comments] = await Promise.all([
      ideasService.getIdeas(),
      ideasService.getAllVotes(),
      ideasService.getAllClickUpSyncs(),
      ideasService.getAllComments()
    ]);

    const ideasWithVotes = ideas.map((idea) => ({
      ...idea,
      votes: votes.filter((v) => v.ideaId === idea.id),
      comments: comments.filter((c) => c.ideaId === idea.id),
      clickup: clickups.find((c) => c.ideaId === idea.id) || undefined,
    }));

    return NextResponse.json(ideasWithVotes);
  } catch (error) {
    console.error('API Error in GET /api/ideas:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ideaSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { title, description, department, category, expectedBenefits } = validated.data;
    
    // Get creator ID from headers (simulating session auth)
    const createdBy = request.headers.get('x-user-id') || 'user_3'; // default to Alex Rivera (employee)

    // 1. Run AI Evaluation Multi-Agent
    const evaluation = await evaluateIdea(title, description, expectedBenefits);

    // 2. Generate standard ID
    const ideaId = 'idea_' + Date.now().toString();

    // 3. Create core Idea object
    const newIdea: Idea = {
      id: ideaId,
      title,
      description,
      department,
      category,
      expectedBenefits: expectedBenefits || '',
      status: 'submitted',
      innovationScore: evaluation.innovationScore,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    // 4. Save Idea to DB
    await ideasService.createIdea(newIdea);

    // 5. Save Agent Reviews
    const reviews: AIReview[] = [];
    for (const [index, rev] of evaluation.reviews.entries()) {
      const reviewObj: AIReview = {
        id: `rev_${ideaId}_${index}`,
        ideaId,
        agentType: rev.agentType,
        score: rev.score,
        analysis: rev.analysis,
      };
      await reviewsService.createReview(reviewObj);
      reviews.push(reviewObj);
    }

    return NextResponse.json({
      idea: newIdea,
      reviews,
      message: 'Idea successfully submitted and evaluated by AI Multi-Agent system.',
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
