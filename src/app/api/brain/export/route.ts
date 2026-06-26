import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';
import { AIReview } from '@/types';

/**
 * GET /api/brain/export
 *
 * Returns a single consolidated JSON payload containing all marketplace data
 * optimised for Deriv Brain ingestion.
 *
 * Security: API key validation is enforced via the Authorization header when
 * DERIV_BRAIN_API_KEY is set in the environment.
 */
export async function GET(request: Request) {
  try {
    // Optional: validate a static Brain API key from env if present
    const expectedKey = process.env.DERIV_BRAIN_API_KEY;
    if (expectedKey) {
      const authHeader = request.headers.get('Authorization') ?? '';
      const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (provided !== expectedKey) {
        return NextResponse.json(
          { error: 'Unauthorized – valid Bearer token required.' },
          { status: 401 }
        );
      }
    }

    // Fetch all ideas (includes votes and comments)
    const ideas = await ideasService.getIdeas();

    // Fetch implemented apps
    const implementedApps = ideas.filter(
      (idea) => idea.status === 'implemented'
    );

    // Fetch all AI reviews per idea and flatten
    const allReviewsNested = await Promise.all(
      ideas.map((idea) => reviewsService.getReviews(idea.id))
    );
    const allReviews: AIReview[] = allReviewsNested.flat();

    // Aggregate statistics
    const byStatus = ideas.reduce<Record<string, number>>((acc, idea) => {
      acc[idea.status] = (acc[idea.status] ?? 0) + 1;
      return acc;
    }, {});

    const byDepartment = ideas.reduce<Record<string, number>>((acc, idea) => {
      if (idea.department) {
        acc[idea.department] = (acc[idea.department] ?? 0) + 1;
      }
      return acc;
    }, {});

    const byCategory = ideas.reduce<Record<string, number>>((acc, idea) => {
      if (idea.category) {
        acc[idea.category] = (acc[idea.category] ?? 0) + 1;
      }
      return acc;
    }, {});

    const scores = ideas.map((i) => i.innovationScore ?? 0).filter(Boolean);
    const avgInnovationScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

    const totalVotes = ideas.reduce(
      (acc, idea) => acc + (idea.votes?.length ?? 0),
      0
    );
    const totalComments = ideas.reduce(
      (acc, idea) => acc + (idea.comments?.length ?? 0),
      0
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      source: 'Deriv AI Innovation Marketplace',
      summary: {
        totalIdeas: ideas.length,
        totalImplementedApps: implementedApps.length,
        totalAIReviews: allReviews.length,
        totalVotes,
        totalComments,
        avgInnovationScore,
        byStatus,
        byDepartment,
        byCategory,
      },
      ideas: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        department: idea.department,
        category: idea.category,
        status: idea.status,
        innovationScore: idea.innovationScore,
        expectedBenefits: idea.expectedBenefits ?? null,
        createdBy: idea.createdBy,
        createdAt: idea.createdAt,
        voteCount: idea.votes?.length ?? 0,
        avgVoteRating:
          idea.votes && idea.votes.length > 0
            ? Math.round(
                (idea.votes.reduce((a, v) => a + (v.vote ?? 0), 0) /
                  idea.votes.length) *
                  100
              ) / 100
            : null,
        commentCount: idea.comments?.length ?? 0,
        madeBy: idea.madeBy ?? null,
      })),
      implementedApps: implementedApps.map((app) => ({
        id: app.id,
        title: app.title,
        description: app.appDescription ?? app.description,
        department: app.department,
        systemOwner: app.systemOwner ?? null,
        backupSystemOwner: app.backupSystemOwner ?? null,
        slackChannel: app.slackChannel ?? null,
        implementedAt: app.implementedAt ?? null,
        madeBy: app.madeBy ?? null,
        innovationScore: app.innovationScore,
      })),
      aiReviews: allReviews.map((review: AIReview) => ({
        id: review.id,
        ideaId: review.ideaId,
        agentType: review.agentType,
        score: review.score,
        analysis: review.analysis,
      })),
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/api/brain/export] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
