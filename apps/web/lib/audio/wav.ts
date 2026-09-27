/**
 * Wrap raw PCM in a WAV container.
 *
 * The ATOM Echo streams raw PCM16 because it cannot know the clip length up
 * front — the button is released when the speaker stops talking — and a WAV
 * header needs the byte count. The server does know it once the upload ends,
 * so the header is written here rather than on a device with 300 KB of RAM.
 */

export interface PcmFormat {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

const HEADER_BYTES = 44;

/** Canonical 44-byte RIFF/WAVE header followed by the PCM payload. */
export function pcmToWav(pcm: Buffer, format: PcmFormat): Buffer {
  const { sampleRate, channels, bitsPerSample } = format;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  const header = Buffer.alloc(HEADER_BYTES);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4); // file size minus the first 8 bytes
  header.write('WAVE', 8, 'ascii');

  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // PCM subchunk size
  header.writeUInt16LE(1, 20); // audio format 1 = uncompressed PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** Seconds of audio a PCM buffer holds, for duration checks. */
export function pcmDurationSeconds(byteLength: number, format: PcmFormat): number {
  const bytesPerSecond = format.sampleRate * format.channels * (format.bitsPerSample / 8);
  return byteLength / bytesPerSecond;
}

/**
 * Loudest sample as a 0–1 fraction of full scale.
 *
 * A clip of near-silence usually means the button was pressed by accident or
 * the mic is dead; transcribing it wastes an API call and returns noise.
 */
export function peakLevel(pcm: Buffer): number {
  let peak = 0;
  // Odd trailing byte cannot form a sample, so stop at the last whole pair.
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const sample = Math.abs(pcm.readInt16LE(i));
    if (sample > peak) peak = sample;
  }
  return peak / 32768;
}
