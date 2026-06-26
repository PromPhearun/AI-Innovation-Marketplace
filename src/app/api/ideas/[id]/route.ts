import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { reviewsService } from '@/services/reviews.service';
import { usersService } from '@/services/users.service';

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate idea ID format to prevent path traversal
    if (!id || !/^[\w-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid idea ID' }, { status: 400 });
    }

    // Verify the requesting user is an admin
    const requestingUserId = request.headers.get('x-user-id');
    if (!requestingUserId) {
      return NextResponse.json({ error: 'Unauthorized: missing user identity' }, { status: 401 });
    }

    const requestingUser = await usersService.getUser(requestingUserId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: only admins can delete ideas' }, { status: 403 });
    }

    // Check idea exists before deleting
    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const deleted = await ideasService.deleteIdea(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('API Error in DELETE /api/ideas/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
