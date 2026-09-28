import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { allowAction } from '@/lib/rate-limit';
import { pcmDurationSeconds, peakLevel } from '@/lib/audio/wav';
import { listServices } from '@/lib/agent/data';
import { runLiveTurn } from '@/lib/atom/live-session';
import {
  isValidSessionId,
  isResetCommand,
  loadConversation,
  saveConversation,
  clearConversation,
} from '@/lib/atom/conversation';
import { ATOM_AUDIO } from '@mediterranea/shared/constants';

/**
 * Voice endpoint for the ATOM Echo.
 *
 * The device streams raw PCM16 while its button is held, because it has no
 * PSRAM and cannot buffer a whole clip. The clip goes to GPT-Live, which hands
 * questions about the studio to the booking agent, and the spoken answer is
 * streamed back as raw PCM16 at the same rate for the device's speaker.
 *
 * Errors before the answer starts are JSON with a 4xx/5xx status; a 200 is
 * always audio (possibly empty, if the voice session failed).
 *
 * Node runtime, not Edge: this reads a binary request body.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const FORMAT = {
  sampleRate: ATOM_AUDIO.sampleRate,
  channels: ATOM_AUDIO.channels,
  bitsPerSample: ATOM_AUDIO.bitsPerSample,
};

/** Below this the clip is silence — a mis-press, or a dead mic. */
const MIN_PEAK = 0.01;

function todayInMalaga(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Constant-time compare that tolerates differing lengths. */
function tokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.ATOM_DEVICE_TOKEN;
  if (!expected || expected.length < 16) {
    console.error('[atom] ATOM_DEVICE_TOKEN is unset or too short; refusing requests.');
    return NextResponse.json({ error: 'Voice endpoint is not configured.' }, { status: 503 });
  }

  if (!tokenMatches(request.headers.get(ATOM_AUDIO.tokenHeader), expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = request.headers.get(ATOM_AUDIO.sessionHeader);
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'Missing or invalid session id.' }, { status: 400 });
  }

  // One device, held button: a handful of requests a minute is generous.
  if (!(await allowAction('atom:speech', 20, 60))) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  let pcm: Buffer;
  try {
    pcm = Buffer.from(await request.arrayBuffer());
  } catch {
    // The device lost power or Wi-Fi mid-upload. Nobody is waiting for this
    // response, but say so plainly rather than logging an unhandled error.
    console.warn('[atom] upload interrupted before it finished');
    return NextResponse.json({ error: 'Upload interrupted' }, { status: 400 });
  }
  const seconds = pcmDurationSeconds(pcm.length, FORMAT);

  if (seconds < ATOM_AUDIO.minSeconds) {
    return NextResponse.json(
      { error: 'Too short', transcript: '', reply: '' },
      { status: 400 }
    );
  }
  if (seconds > ATOM_AUDIO.maxSeconds) {
    return NextResponse.json({ error: 'Too long' }, { status: 413 });
  }
  if (peakLevel(pcm) < MIN_PEAK) {
    // Don't open a voice session for silence.
    return NextResponse.json(
      { error: 'No speech detected', transcript: '', reply: '' },
      { status: 422 }
    );
  }

  const [history, services] = await Promise.all([
    loadConversation(sessionId),
    listServices().catch(() => []),
  ]);

  // The reply is streamed as it's spoken: the device starts playing ~0.2 s
  // after the model starts talking instead of waiting for the whole answer.
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await runLiveTurn({
          pcm,
          history,
          serviceNames: services.map((s) => s.name),
          today: todayInMalaga(),
          signal: abort.signal,
          onAudio: (chunk) => {
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch {
              // The device hung up; the session is being aborted.
            }
          },
        });

        console.info(
          `[atom] turn ended by ${result.endedBy}; delegations=${result.delegations}; billed=${result.usageSeconds ?? '?'}s`
        );

        if (result.heard) {
          // A spoken reset ends the conversation. The voice has already
          // confirmed it out loud; here we forget.
          if (isResetCommand(result.heard)) {
            await clearConversation(sessionId);
          } else if (result.said) {
            await saveConversation(sessionId, [
              ...history,
              { role: 'user', content: result.heard },
              { role: 'assistant', content: result.said },
            ]);
          }
        }
      } catch (error) {
        console.error('[atom] voice session failed:', error);
      } finally {
        try {
          controller.close();
        } catch {
          // Already cancelled by the client.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': `audio/L16;rate=${ATOM_AUDIO.sampleRate};channels=${ATOM_AUDIO.channels}`,
      'Cache-Control': 'no-store',
    },
  });
}
