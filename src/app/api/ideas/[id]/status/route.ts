import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { usersService } from '@/services/users.service';

async function handleStatusUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, managerComment, systemOwner, backupSystemOwner, slackChannel, implementedAt, appDescription } = body;

    const allowedStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'implemented'] as const;
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // --- Admin-only enforcement: only admin can revert an idea OUT of 'implemented' ---
    const currentIdea = await ideasService.getIdea(id);
    if (!currentIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (currentIdea.status === 'implemented' && status !== 'implemented') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized: missing x-user-id header' },
          { status: 401 }
        );
      }
      const user = await usersService.getUser(userId);
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: only admins can revert an implemented app back to Innovation Hub' },
          { status: 403 }
        );
      }
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

    // Input Validation & Sanitization for Operational/Implementation Fields (Security Principle 1)
    let validatedSystemOwner: string | undefined = undefined;
    let validatedBackupOwner: string | undefined = undefined;
    let validatedSlackChannel: string | undefined = undefined;
    let validatedImplementedAt: string | undefined = undefined;
    let validatedAppDescription: string | undefined = undefined;

    if (status === 'implemented') {
      if (!systemOwner || typeof systemOwner !== 'string' || systemOwner.trim().length === 0) {
        return NextResponse.json({ error: 'System owner is required for implemented apps' }, { status: 400 });
      }
      if (systemOwner.length > 100) {
        return NextResponse.json({ error: 'System owner name must be 100 characters or less' }, { status: 400 });
      }
      validatedSystemOwner = systemOwner.trim();

      if (backupSystemOwner !== undefined && backupSystemOwner !== null && backupSystemOwner !== '') {
        if (typeof backupSystemOwner !== 'string') {
          return NextResponse.json({ error: 'Backup system owner must be a string' }, { status: 400 });
        }
        if (backupSystemOwner.length > 100) {
          return NextResponse.json({ error: 'Backup system owner name must be 100 characters or less' }, { status: 400 });
        }
        validatedBackupOwner = backupSystemOwner.trim();
      }

      if (!slackChannel || typeof slackChannel !== 'string' || slackChannel.trim().length === 0) {
        return NextResponse.json({ error: 'Slack channel is required for implemented apps' }, { status: 400 });
      }
      if (slackChannel.length > 80) {
        return NextResponse.json({ error: 'Slack channel must be 80 characters or less' }, { status: 400 });
      }
      const slackTrimmed = slackChannel.trim();
      // Enforce channel starting with # or alphanumeric
      if (!/^#?[a-zA-Z0-9_-]+$/.test(slackTrimmed)) {
        return NextResponse.json({ error: 'Slack channel must be a valid channel name (e.g. #my-channel)' }, { status: 400 });
      }
      validatedSlackChannel = slackTrimmed.startsWith('#') ? slackTrimmed : `#${slackTrimmed}`;

      if (!implementedAt || typeof implementedAt !== 'string') {
        return NextResponse.json({ error: 'Implementation date is required' }, { status: 400 });
      }
      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(implementedAt)) {
        return NextResponse.json({ error: 'Implementation date must be in YYYY-MM-DD format' }, { status: 400 });
      }
      validatedImplementedAt = implementedAt;

      // appDescription is optional — if provided, validate it
      if (appDescription !== undefined && appDescription !== null && appDescription !== '') {
        if (typeof appDescription !== 'string') {
          return NextResponse.json({ error: 'App description must be a string' }, { status: 400 });
        }
        if (appDescription.length > 500) {
          return NextResponse.json({ error: 'App description must be 500 characters or less' }, { status: 400 });
        }
        validatedAppDescription = appDescription.trim();
      }
    }

    const updatedIdea = await ideasService.updateIdeaStatus(
      id,
      status as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented',
      validatedComment,
      validatedSystemOwner,
      validatedBackupOwner,
      validatedSlackChannel,
      validatedImplementedAt,
      validatedAppDescription
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
