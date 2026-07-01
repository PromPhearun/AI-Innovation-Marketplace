'use strict';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { implementedAppSchema } from '@/utils/schemas';
import { ideasService } from '@/services/ideas.service';
import { usersService } from '@/services/users.service';
import { Idea } from '@/types';

export async function PATCH(request: Request) {
  try {
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
        { error: 'Forbidden: only admins can edit implemented ideas' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const patchSchema = implementedAppSchema.extend({
      id: z.string().min(1, 'Idea ID is required'),
      appDescription: z.string().max(2000).optional().or(z.literal('')),
    });

    const validated = patchSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validated.error.format() },
        { status: 400 }
      );
    }

    const {
      id,
      title,
      description,
      department,
      category,
      systemOwner,
      backupSystemOwner,
      slackChannel,
      implementedAt,
      madeBy,
      appDescription,
    } = validated.data;

    const updatedApp = await ideasService.updateImplementedApp(id, {
      title,
      description,
      department,
      category,
      systemOwner,
      backupSystemOwner,
      slackChannel,
      implementedAt,
      madeBy,
      appDescription,
    });

    if (!updatedApp) {
      return NextResponse.json(
        { error: 'Implemented app not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      app: updatedApp,
      message: 'App successfully updated in the Productions Hub.',
    });
  } catch (error) {
    console.error('API Error in PATCH /api/implemented:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = implementedAppSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validated.error.format() },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      department,
      category,
      systemOwner,
      backupSystemOwner,
      slackChannel,
      implementedAt,
      madeBy,
    } = validated.data;

    // Get creator ID from headers (simulating session auth)
    const createdBy = request.headers.get('x-user-id') || 'user_3';

    // Generate unique ID starting with manual_idea_
    const ideaId = 'manual_idea_' + Date.now().toString();

    // Create the fully implemented manual Idea object
    const newApp: Idea = {
      id: ideaId,
      title,
      description,
      department,
      category,
      status: 'implemented',
      innovationScore: 100, // Mark as 100 since it is fully implemented and operational
      createdBy,
      createdAt: new Date().toISOString(),
      systemOwner,
      backupSystemOwner: backupSystemOwner || '',
      slackChannel,
      implementedAt,
      isManualProject: true,
      madeBy,
    };

    // Save to DB
    await ideasService.createIdea(newApp);

    return NextResponse.json({
      success: true,
      app: newApp,
      message: 'App successfully registered in the Productions Hub.',
    });
  } catch (error) {
    console.error('API Error in POST /api/implemented:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
