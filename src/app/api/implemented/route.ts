'use strict';

import { NextResponse } from 'next/server';
import { implementedAppSchema } from '@/utils/schemas';
import { ideasService } from '@/services/ideas.service';
import { Idea } from '@/types';

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
      message: 'App successfully registered in the Implemented Hub.',
    });
  } catch (error) {
    console.error('API Error in POST /api/implemented:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
