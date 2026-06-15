import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';

async function handleStatusUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    const allowedStatuses = ['submitted', 'under_review', 'approved', 'rejected'] as const;
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updatedIdea = await ideasService.updateIdeaStatus(id, status as 'submitted' | 'under_review' | 'approved' | 'rejected');
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
