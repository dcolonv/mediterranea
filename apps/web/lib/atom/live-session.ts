import WebSocket from 'ws';
import { runBookingAgent, type AgentMessage } from '@/lib/agent/booking-agent';

/**
 * One ATOM Echo button press, run as one GPT-Live session.
 *
 * GPT-Live does the listening and speaking. When the question needs real data
 * it raises a client delegation, and the existing booking agent answers it —
 * the same agent, instructions and read-only gate as everywhere else.
 *
 * GPT-Live is built for full-duplex calls; the ATOM is push-to-talk and cannot
 * listen while it speaks. Fitting one to the other needs three things the docs
 * don't cover, all found by experiment. They are kept here, together, so
 * they're easy to find if GPT-Live's behaviour changes:
 *
 *   1. SILENCE KEEPALIVE. The session's clock advances with incoming audio. Stop
 *      sending audio after the clip and the model freezes mid-sentence. So once
 *      the button is released, the server streams silence until the turn ends.
 *   2. END OF TURN BY LOUDNESS. There is no "finished speaking" event, and with
 *      the keepalive running the model streams audio continuously — silent when
 *      idle. So the turn ends a short while after the last *audible* audio, and
 *      never while an agent answer is pending or not yet begun.
 *   3. PLAIN COMMENTARY. The agent answers in Markdown. A long Markdown answer
 *      was never accepted (context_injection_incomplete); short plain text was
 *      taken in ~0.4 s. So answers are flattened to speakable text first.
 *
 * Re-run `scripts/atom-voice-test.ts` after any GPT-Live update to catch a
 * change in (1) before a device goes quiet mid-sentence.
 */

const LIVE_URL = 'wss://api.openai.com/v1/live/sessions';
const MODEL = 'gpt-live-1';

/** The ATOM's format, which GPT-Live accepts natively in both directions. */
export const LIVE_SAMPLE_RATE = 16000;
const CHUNK_BYTES = 3200; // 100 ms

/** Output quieter than this is the model's idle silence, not speech. */
const VOICE_THRESHOLD = 0.02;
/** Silence after speech that ends the turn. */
const END_OF_TURN_MS = 1500;
/** Give up if nothing is said at all this long after the user finished. */
const NO_REPLY_MS = 12000;
/** Give up if an answer was handed over but never started being spoken. */
const ANSWER_START_MS = 15000;
/** Hard ceiling, kept under the route's maxDuration. */
const HARD_TIMEOUT_MS = 55000;

/**
 * Told to the booking agent, whose answer the voice reads out. The studio has
 * one client at a time, so a first name is unambiguous; surnames, emails and
 * phone numbers are never needed out loud.
 */
const SPOKEN_ANSWER_NOTE =
  'Your answer will be read aloud in the studio. Answer in two or three short plain sentences with no lists or markdown. Refer to clients by first name only — never say a surname, email address or phone number.';

const SILENCE_FRAME = Buffer.alloc(CHUNK_BYTES).toString('base64');

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/**
 * How the voice should behave. Service names are passed in from the live
 * catalogue: brand names are easily misheard ("INDIBA" came back as "enderma"
 * and "end of a" in testing), and naming them up front fixed it.
 */
export function buildVoiceInstructions(serviceNames: string[]): string {
  const vocabulary = ['Olivia', 'INDIBA (a radiofrequency facial, said "in-DEE-ba")', 'Mediterránea', ...serviceNames];
  return [
    'You are Olivia, the voice assistant of Mediterránea Face Studio, a facial studio in Málaga, speaking to studio staff through a small speaker.',
    'People wake you by saying "Hola Olivia" or "Hi Olivia", so a recording may begin with your name or the end of it. That is not the question: answer what follows it, without greeting back. If they only said your name, ask briefly how you can help.',
    'Keep every reply to one or two short sentences.',
    'Everything you say is spoken aloud: never use lists, markdown, symbols or emoji.',
    'Say prices, times and dates naturally, the way a person would.',
    "Always reply in the language of the person's latest question, even if earlier turns used another language.",
    'When you mention a client, use only their first name — never their surname.',
    'For anything about appointments, availability, treatments, prices or clients, delegate to the backend and speak its answer. Never guess these.',
    'For greetings or small talk, answer directly.',
    'If the person asks to start over or begin a new conversation, just confirm it briefly.',
    'Tone: warm, calm and unhurried.',
    `Words you will hear often: ${vocabulary.join(', ')}.`,
  ].join(' ');
}

/** Markdown -> plain spoken text, well under the 500-token commentary limit. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/:\s*\n+/g, ': ')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/([.,:;])\s*\./g, '$1')
    .replace(/\s+([.,:;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 900);
}

/** Loudest sample in a PCM16 chunk, 0..1. */
export function peak(chunk: Buffer): number {
  let p = 0;
  for (let i = 0; i + 1 < chunk.length; i += 2) {
    const v = Math.abs(chunk.readInt16LE(i));
    if (v > p) p = v;
  }
  return p / 32768;
}

export function isVoiced(chunk: Buffer): boolean {
  return peak(chunk) >= VOICE_THRESHOLD;
}

/** Stored conversation -> GPT-Live's initial items, so memory spans presses. */
export function historyToInput(history: AgentMessage[]) {
  return history.map((m) =>
    m.role === 'user'
      ? { type: 'message', role: 'user', content: [{ type: 'input_text', text: m.content }] }
      : { type: 'message', role: 'assistant', content: [{ type: 'text', text: m.content }] }
  );
}

// ── The session ──────────────────────────────────────────────────────────────

export interface LiveTurnOptions {
  /** The recording: PCM16 mono at LIVE_SAMPLE_RATE. */
  pcm: Buffer;
  history: AgentMessage[];
  serviceNames: string[];
  today: string;
  /** Each chunk of spoken reply, in order, as it arrives. */
  onAudio: (chunk: Buffer) => void;
  /** Aborts the session — e.g. the device hung up to start a new recording. */
  signal?: AbortSignal;
  voice?: string;
}

export interface LiveTurnResult {
  heard: string;
  said: string;
  delegations: number;
  usageSeconds?: number;
  closeReason?: string;
  /** Why the turn ended, for logs. */
  endedBy: 'speech-finished' | 'no-reply' | 'answer-never-spoken' | 'timeout' | 'aborted' | 'closed';
}

export function runLiveTurn(opts: LiveTurnOptions): Promise<LiveTurnResult> {
  const { pcm, history, serviceNames, today, onAudio, signal } = opts;

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const now = () => Date.now() - started;

    let heard = '';
    let said = '';
    let delegations = 0;
    let pendingDelegations = 0;
    let usageSeconds: number | undefined;
    let closeReason: string | undefined;
    let endedBy: LiveTurnResult['endedBy'] = 'closed';

    let mutedAt = 0;
    let lastVoiceAt = 0;
    let awaitingAnswer = false;
    let answerAckedAt = 0;
    let closing = false;
    let settled = false;
    let keepalive: ReturnType<typeof setInterval> | undefined;

    const ws = new WebSocket(LIVE_URL, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    const send = (event: object) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      clearInterval(watchdog);
      if (keepalive) clearInterval(keepalive);
      signal?.removeEventListener('abort', onAbort);
      resolve({ heard: heard.trim(), said: said.trim(), delegations, usageSeconds, closeReason, endedBy });
    };

    const endTurn = (reason: LiveTurnResult['endedBy']) => {
      if (closing) return;
      closing = true;
      endedBy = reason;
      if (keepalive) clearInterval(keepalive);
      send({ type: 'session.close' });
      // session.closed normally follows; don't hang if it doesn't.
      setTimeout(() => ws.terminate(), 3000);
    };

    const onAbort = () => endTurn('aborted');
    signal?.addEventListener('abort', onAbort);

    const watchdog = setInterval(() => {
      if (closing || !mutedAt) return;
      const t = now();
      if (t > HARD_TIMEOUT_MS) return endTurn('timeout');
      if (pendingDelegations > 0) return;

      if (awaitingAnswer) {
        if (answerAckedAt && t - answerAckedAt > ANSWER_START_MS) endTurn('answer-never-spoken');
        return;
      }
      if (lastVoiceAt === 0) {
        if (t - mutedAt > NO_REPLY_MS) endTurn('no-reply');
        return;
      }
      if (t - lastVoiceAt >= END_OF_TURN_MS) endTurn('speech-finished');
    }, 100);

    ws.on('open', () => {
      send({
        type: 'session.start',
        event_id: 'evt_start',
        session: {
          model: MODEL,
          instructions: buildVoiceInstructions(serviceNames),
          audio: {
            format: { type: 'audio/pcm', rate: LIVE_SAMPLE_RATE },
            output: { voice: opts.voice ?? 'marin' },
          },
          delegation: { type: 'client' },
          input: historyToInput(history),
        },
      });
    });

    const answerDelegation = async (delegationId: string) => {
      pendingDelegations++;
      delegations++;
      let reply: string;
      try {
        const result = await runBookingAgent(
          [...history, { role: 'user', content: heard.trim() || '(inaudible)' }],
          // Read-only: the device has no screen and no way to confirm a booking.
          { today, readOnly: true, channelNote: SPOKEN_ANSWER_NOTE }
        );
        reply = toSpeakable(result.reply);
      } catch (error) {
        console.error('[atom] booking agent failed during a live session:', error);
        // Say something rather than leave the room in silence.
        reply = 'Sorry, I could not check that right now. Please try again in a moment.';
      } finally {
        pendingDelegations--;
      }
      awaitingAnswer = true;
      send({
        type: 'session.commentary.append',
        event_id: `evt_answer_${delegations}`,
        delegation_id: delegationId,
        content: reply,
      });
    };

    ws.on('message', (raw) => {
      let e: { type: string; [k: string]: unknown };
      try {
        e = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (e.type) {
        case 'session.started': {
          for (let i = 0; i < pcm.length; i += CHUNK_BYTES) {
            send({ type: 'session.input_audio.append', audio: pcm.subarray(i, i + CHUNK_BYTES).toString('base64') });
          }
          send({ type: 'session.input_audio.mute', event_id: 'evt_mute' });
          // (1) keep the clock moving so the model can finish speaking.
          keepalive = setInterval(() => {
            if (!closing) send({ type: 'session.input_audio.append', audio: SILENCE_FRAME });
          }, 100);
          break;
        }
        case 'session.input_audio.muted':
          mutedAt = now();
          break;
        case 'session.input_transcript.delta':
          heard += (e.delta as string) ?? '';
          break;
        case 'session.output_transcript.delta':
          said += (e.delta as string) ?? '';
          break;
        case 'session.output_audio.delta': {
          const chunk = Buffer.from(e.delta as string, 'base64');
          // (2) judge the end of the turn by what the audio contains.
          if (isVoiced(chunk)) {
            lastVoiceAt = now();
            if (awaitingAnswer && answerAckedAt) awaitingAnswer = false;
          }
          if (!closing) onAudio(chunk);
          break;
        }
        case 'session.delegation.created': {
          const delegation = e.delegation as { id: string };
          void answerDelegation(delegation.id);
          break;
        }
        case 'session.commentary.appended':
          answerAckedAt = now();
          break;
        case 'session.closed': {
          const session = e.session as { usage?: { seconds?: number } } | undefined;
          usageSeconds = session?.usage?.seconds;
          closeReason = e.reason as string;
          ws.close();
          break;
        }
        case 'error':
          console.warn('[atom] GPT-Live error:', JSON.stringify(e.error ?? e).slice(0, 300));
          break;
      }
    });

    ws.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearInterval(watchdog);
      if (keepalive) clearInterval(keepalive);
      reject(err);
    });

    ws.on('close', finish);
  });
}
