import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';

async function handleStatusUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, managerComment } = body;

    const allowedStatuses = ['submitted', 'under_review', 'approved', 'rejected'] as const;
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    let validatedComment: string | undefined = undefined;
    if (managerComment !== undefined) {
      if (typeof managerComment !== 'string') {
        return NextResponse.json(
          { error: 'Manager comment must be a string' },
          { status: 400 }
        );
      }
      if (managerComment.length > 2000) {
        return NextResponse.json(
          { error: 'Manager comment must be 2000 characters or less' },
          { status: 400 }
        );
      }
      validatedComment = managerComment;
    }

    const updatedIdea = await ideasService.updateIdeaStatus(
      id,
      status as 'submitted' | 'under_review' | 'approved' | 'rejected',
      validatedComment
    );
    if (!updatedIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error('API Error in status update route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export { handleStatusUpdate as POST, handleStatusUpdate as PATCH };
