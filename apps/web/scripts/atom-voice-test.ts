/**
 * End-to-end check of the ATOM voice endpoint, driven exactly like the device:
 * one POST of raw 16 kHz PCM16 per spoken question, same session id across
 * questions, spoken reply streamed back and saved as WAV.
 *
 * Re-run after any GPT-Live update. It catches the failure the device can't
 * report: the model going quiet mid-sentence (see lib/atom/live-session.ts).
 *
 * Needs the web dev server running (`pnpm dev:web`) and ATOM_DEVICE_TOKEN in
 * .env.local. Questions are synthesized with macOS `say`.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/atom-voice-test.ts "What INDIBA treatments do you offer?" "How long is the second one?"
 *   npx tsx scripts/atom-voice-test.ts --url=https://www.mediterraneafacestudio.com "¿Qué citas hay mañana?"
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import { ATOM_AUDIO } from '@mediterranea/shared/constants';

dotenv.config({ path: '.env.local' });

const RATE = ATOM_AUDIO.sampleRate;

function synthesize(text: string, dir: string, n: number): Buffer {
  const aiff = join(dir, `q${n}.aiff`);
  const wav = join(dir, `q${n}.wav`);
  const voice = /[áéíóúñ¿¡]/i.test(text) ? 'Monica' : 'Samantha';
  execFileSync('say', ['-v', voice, '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${RATE}`, '-c', '1', aiff, wav]);
  const file = readFileSync(wav);
  for (let i = 12; i < file.length; ) {
    const size = file.readUInt32LE(i + 4);
    if (file.toString('ascii', i, i + 4) === 'data') return file.subarray(i + 8, i + 8 + size);
    i += 8 + size + (size % 2);
  }
  throw new Error('no data chunk');
}

function wavFrom(pcm: Buffer): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function main() {
  const args = process.argv.slice(2);
  const base = args.find((a) => a.startsWith('--url='))?.slice(6) ?? 'http://localhost:3000';
  const questions = args.filter((a) => !a.startsWith('--'));
  const token = process.env.ATOM_DEVICE_TOKEN;
  if (!token) throw new Error('ATOM_DEVICE_TOKEN is not set in .env.local');
  if (!questions.length) throw new Error('Pass at least one question.');

  const dir = mkdtempSync(join(tmpdir(), 'atom-voice-'));
  const sessionId = randomBytes(8).toString('hex');
  let failures = 0;

  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    const pcm = synthesize(q, dir, n);
    console.log(`\n[${n}] asked: "${q}" (${(pcm.length / 2 / RATE).toFixed(1)} s)`);

    const sent = Date.now();
    const res = await fetch(`${base}${ATOM_AUDIO.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [ATOM_AUDIO.tokenHeader]: token,
        [ATOM_AUDIO.sessionHeader]: sessionId,
      },
      body: new Uint8Array(pcm),
    });
    if (!res.ok || !res.body) {
      console.log(`    FAILED ${res.status}: ${await res.text()}`);
      failures++;
      continue;
    }

    const chunks: Buffer[] = [];
    let firstVoiceMs = 0;
    for await (const c of res.body as unknown as AsyncIterable<Uint8Array>) {
      const b = Buffer.from(c);
      if (!firstVoiceMs) {
        for (let j = 0; j + 1 < b.length; j += 2) {
          if (Math.abs(b.readInt16LE(j)) > 655) {
            firstVoiceMs = Date.now() - sent;
            break;
          }
        }
      }
      chunks.push(b);
    }
    const reply = Buffer.concat(chunks);
    const out = join(dir, `reply${n}.wav`);
    writeFileSync(out, wavFrom(reply));

    const seconds = reply.length / 2 / RATE;
    console.log(
      `    reply: ${seconds.toFixed(1)} s of audio, first voice at ${firstVoiceMs} ms, done at ${Date.now() - sent} ms`
    );
    console.log(`    saved: ${out}`);
    if (!firstVoiceMs) {
      console.log('    FAILED: no audible reply');
      failures++;
    }
  }

  console.log(`\nsession ${sessionId}: ${questions.length - failures}/${questions.length} spoken replies`);
  console.log('Transcripts of what was heard and said are in the dev server log and Firestore atomConversations.');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
