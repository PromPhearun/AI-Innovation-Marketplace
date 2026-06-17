import { NextResponse } from 'next/server';
import { ideasService } from '@/services/ideas.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Strict input validation
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid idea ID format' }, { status: 400 });
    }

    const idea = await ideasService.getIdea(id);
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Compose an awesome Slack Markdown/block message
    const message = `*🚀 New Innovation Pitch Broadcasted!*

*Title:* ${idea.title}
*Category:* ${idea.category} | *Department:* ${idea.department}
*Innovation Score:* ⭐ ${idea.innovationScore}/100

*Description:*
${idea.description}

*Expected Benefits:*
${idea.expectedBenefits || 'N/A'}

🔗 _View proposal and participate in voting/reviews in the AI Innovation Marketplace:_ <https://localhost:3000/ideas/${id}>`;

    // Simulated payload response
    return NextResponse.json({
      success: true,
      channel: '#innovation-broadcast',
      timestamp: new Date().toISOString(),
      message,
      payload: {
        text: `🚀 Innovation Spotlight: ${idea.title}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚀 New Innovation Spotlight Broadcast',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Title:* *${idea.title}*\n*Category:* ${idea.category} | *Score:* ⭐ *${idea.innovationScore}/100*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Description:*\n${idea.description.substring(0, 300)}${idea.description.length > 300 ? '...' : ''}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📍 Shared with *#innovation-broadcast* • Synced via AI Marketplace`
              }
            ]
          }
        ]
      }
    });
  } catch (error) {
    console.error('API Error in POST /api/ideas/[id]/slack:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
