import { NextResponse } from 'next/server';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { doc, setDoc, collection } from 'firebase/firestore';

/**
 * POST /api/brain/webhook
 *
 * Receives inbound payloads from Deriv Brain (e.g. AI insights, recommendations,
 * triggered actions) and persists them for the marketplace to surface.
 *
 * Security:
 *  - HMAC-SHA256 signature verification via X-Brain-Signature header (when
 *    DERIV_BRAIN_WEBHOOK_SECRET is set in environment).
 *  - Input validation on required fields.
 *  - All data is stored in Firestore `brainWebhooks` collection.
 */

interface BrainWebhookPayload {
  event: string;
  data: Record<string, unknown>;
  sentAt?: string;
}

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Validate Content-Type
    const contentType = request.headers.get('Content-Type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json.' },
        { status: 415 }
      );
    }

    // Optional HMAC signature verification
    const webhookSecret = process.env.DERIV_BRAIN_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('X-Brain-Signature') ?? '';
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing X-Brain-Signature header.' },
          { status: 401 }
        );
      }
      const valid = await verifySignature(rawBody, signature, webhookSecret);
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid webhook signature.' },
          { status: 401 }
        );
      }
    }

    // Parse and validate payload
    let payload: BrainWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as BrainWebhookPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    if (!payload.event || typeof payload.event !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: event (string).' },
        { status: 400 }
      );
    }
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: data (object).' },
        { status: 400 }
      );
    }

    // Sanitise event name: only allow alphanumeric, underscore, dot, hyphen
    const sanitisedEvent = payload.event.replace(/[^a-zA-Z0-9._-]/g, '');
    if (sanitisedEvent.length === 0 || sanitisedEvent.length > 100) {
      return NextResponse.json(
        { error: 'event field must be 1–100 alphanumeric/dot/dash/underscore characters.' },
        { status: 400 }
      );
    }

    const recordId = `brain_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      id: recordId,
      event: sanitisedEvent,
      data: payload.data,
      receivedAt: new Date().toISOString(),
      sentAt: payload.sentAt ?? null,
    };

    // Persist to Firestore (or mock-db fallback is not needed — just log if no Firebase)
    if (isFirebaseConfigured) {
      const docRef = doc(collection(db, 'brainWebhooks'), recordId);
      await setDoc(docRef, record);
    } else {
      // In development without Firebase, log to console
      console.info('[Brain Webhook] Received (no-db):', JSON.stringify(record, null, 2));
    }

    return NextResponse.json(
      { success: true, id: recordId, receivedAt: record.receivedAt },
      { status: 200 }
    );
  } catch (error) {
    console.error('[/api/brain/webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
