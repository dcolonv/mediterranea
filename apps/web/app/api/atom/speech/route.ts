import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import OpenAI from 'openai';
import { allowAction } from '@/lib/rate-limit';
import { pcmToWav, pcmDurationSeconds, peakLevel } from '@/lib/audio/wav';
import { runBookingAgent } from '@/lib/agent/booking-agent';
import { ATOM_AUDIO } from '@mediterranea/shared/constants';

/**
 * Voice endpoint for the ATOM Echo.
 *
 * The device streams raw PCM16 while its button is held, because it has no
 * PSRAM and cannot buffer a whole clip. This wraps it in a WAV container,
 * transcribes it, and runs the text through the booking agent.
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
    // Don't spend a transcription call on silence.
    return NextResponse.json(
      { error: 'No speech detected', transcript: '', reply: '' },
      { status: 422 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const wav = pcmToWav(pcm, FORMAT);

    const transcription = await client.audio.transcriptions.create({
      file: new File([new Uint8Array(wav)], 'speech.wav', { type: 'audio/wav' }),
      model: process.env.ATOM_STT_MODEL || 'whisper-1',
      // The studio operates in Spanish and English; leaving language unset lets
      // Whisper decide per clip rather than forcing one.
    });

    const transcript = transcription.text.trim();
    if (!transcript) {
      return NextResponse.json({ transcript: '', reply: '' }, { status: 200 });
    }

    // Read-only on purpose. The device has no screen and no way to confirm a
    // booking, and the agent's write tools require confirmation by design.
    const result = await runBookingAgent([{ role: 'user', content: transcript }], {
      today: todayInMalaga(),
      proposeWrites: false,
    });

    return NextResponse.json({ transcript, reply: result.reply }, { status: 200 });
  } catch (error) {
    console.error('[atom] speech request failed:', error);
    return NextResponse.json({ error: 'Could not process the audio.' }, { status: 500 });
  }
}
