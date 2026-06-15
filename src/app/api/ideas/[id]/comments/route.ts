import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { commentSchema } from '@/utils/schemas';
import { Comment } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await ideasService.getComments(id);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('API Error in GET /api/ideas/[id]/comments:', error);
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
    const body = await request.json();

    const validated = commentSchema.safeParse({ ...body, ideaId: id });
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validated.error.format() },
        { status: 400 }
      );
    }

    const { comment } = validated.data;
    const userId = request.headers.get('x-user-id') || 'user_3';

    const newComment: Comment = {
      id: 'comment_' + Date.now().toString(),
      ideaId: id,
      userId,
      comment,
      createdAt: new Date().toISOString(),
    };

    const savedComment = await ideasService.addComment(newComment);
    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
