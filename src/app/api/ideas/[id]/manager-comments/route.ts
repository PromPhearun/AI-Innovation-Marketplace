import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { usersService } from '@/services/users.service';
import { ManagerComment } from '@/types';
import { randomUUID } from 'crypto';

/**
 * GET /api/ideas/[id]/manager-comments
 * Returns all manager/admin comments for an idea (visible to everyone).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const comments: ManagerComment[] = idea.managerComments ?? [];

    // Back-compat: if legacy managerComment exists but managerComments is empty, expose it
    if (comments.length === 0 && idea.managerComment) {
      const legacyEntry: ManagerComment = {
        id: 'legacy',
        authorId: 'system',
        authorName: 'Manager',
        comment: idea.managerComment,
        createdAt: idea.createdAt,
      };
      return NextResponse.json([legacyEntry]);
    }

    return NextResponse.json(comments);
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/manager-comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/ideas/[id]/manager-comments
 * Appends a new comment. Only manager or admin roles are permitted.
 * Comments cannot be edited or deleted.
 *
 * Body: { comment: string }
 * Header: x-user-id (required)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // --- Authorization ---
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: missing x-user-id header' }, { status: 401 });
    }

    const user = await usersService.getUser(userId);
    if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins may post comments' },
        { status: 403 }
      );
    }

    // --- Idea existence check ---
    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // --- Input validation ---
    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment must be a non-empty string' },
        { status: 400 }
      );
    }
    if (comment.length > 2000) {
      return NextResponse.json(
        { error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    const sanitizedComment = comment.trim();

    const newComment: ManagerComment = {
      id: randomUUID(),
      authorId: user.id,
      authorName: user.name,
      comment: sanitizedComment,
      createdAt: new Date().toISOString(),
    };

    // --- Persist ---
    const updatedIdea = await ideasService.addManagerComment(id, newComment);
    if (!updatedIdea) {
      return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/manager-comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
