import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { voteSchema } from '@/utils/schemas';
import { Vote } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validated = voteSchema.safeParse({ ...body, ideaId: id });
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { vote } = validated.data;
    const userId = request.headers.get('x-user-id') || 'user_3';

    // 1. Fetch current votes to check if there is an existing vote
    const currentVotes = await ideasService.getVotes(id);
    const existingVote = currentVotes.find((v) => v.userId === userId);

    if (existingVote) {
      if (existingVote.vote === vote) {
        // If same vote, treat as toggle off (remove vote)
        await ideasService.removeVote(id, userId);
        return NextResponse.json({ message: 'Vote removed', currentVote: null });
      } else {
        // Update vote
        const newVoteObj: Vote = { ideaId: id, userId, vote, createdAt: new Date().toISOString() };
        await ideasService.addVote(newVoteObj);
        return NextResponse.json({ message: 'Vote updated', currentVote: vote });
      }
    } else {
      // Add new vote
      const newVoteObj: Vote = { ideaId: id, userId, vote, createdAt: new Date().toISOString() };
      await ideasService.addVote(newVoteObj);
      return NextResponse.json({ message: 'Vote recorded', currentVote: vote });
    }
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/vote:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
