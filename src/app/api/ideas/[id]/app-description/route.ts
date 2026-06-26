import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';
import { openai, MODEL_NAME } from '@/lib/ai/client';

/**
 * POST /api/ideas/[id]/app-description
 * Generates a concise 2-3 sentence app description for the Active Apps directory using AI.
 * Falls back to a trimmed version of the original description if OpenAI is unavailable.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    let appDescription: string;

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('No API key configured');
      }

      const prompt = `You are writing a short, professional app description for a live production application directory.
Based on the following information, write a concise 2-3 sentence description (max 200 characters) suitable for an app card in a company internal app catalog.

App Name: "${idea.title}"
Original Description: "${idea.description}"
Expected Benefits: "${idea.expectedBenefits || 'N/A'}"

Requirements:
- Write in present tense (e.g., "Automates...", "Enables...", "Provides...")
- Be specific about what the app does and its core value
- Keep it under 200 characters
- Do NOT start with the app name
- Output only the description text, no quotes, no markdown`;

      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer creating concise app descriptions for an internal app directory. Output only the description text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 120,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty AI response');
      }
      // Truncate to 300 chars as a hard cap for safety
      appDescription = content.slice(0, 300);
    } catch {
      // Fallback: use the first 200 chars of the original description
      appDescription = idea.description.slice(0, 200).trim();
      if (idea.description.length > 200) {
        appDescription += '...';
      }
    }

    return NextResponse.json({ appDescription });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/app-description:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
