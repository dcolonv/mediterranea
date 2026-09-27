import { describe, it, expect } from 'vitest';
import { pcmToWav, pcmDurationSeconds, peakLevel } from './wav';

const FORMAT = { sampleRate: 16000, channels: 1, bitsPerSample: 16 };

/** `seconds` of a constant sample value, as the device would send it. */
function pcm(seconds: number, value = 0): Buffer {
  const samples = Math.round(FORMAT.sampleRate * seconds);
  const buf = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) buf.writeInt16LE(value, i * 2);
  return buf;
}

describe('pcmToWav', () => {
  const wav = pcmToWav(pcm(1), FORMAT);

  it('writes a canonical 44-byte RIFF/WAVE header', () => {
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(wav.subarray(12, 16).toString('ascii')).toBe('fmt ');
    expect(wav.subarray(36, 40).toString('ascii')).toBe('data');
    expect(wav.length).toBe(44 + 32000);
  });

  it('describes the device format the decoder will rely on', () => {
    expect(wav.readUInt16LE(20)).toBe(1); // uncompressed PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(16000); // sample rate
    expect(wav.readUInt32LE(28)).toBe(32000); // byte rate
    expect(wav.readUInt16LE(32)).toBe(2); // block align
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
  });

  it('records both length fields consistently', () => {
    // Getting these wrong yields a file players accept but truncate.
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
  });

  it('leaves the payload byte-for-byte intact', () => {
    const payload = pcm(0.01, 1234);
    const out = pcmToWav(payload, FORMAT);
    expect(out.subarray(44).equals(payload)).toBe(true);
  });

  it('handles an empty clip without producing a malformed header', () => {
    const out = pcmToWav(Buffer.alloc(0), FORMAT);
    expect(out.length).toBe(44);
    expect(out.readUInt32LE(40)).toBe(0);
  });
});

describe('pcmDurationSeconds', () => {
  it('converts byte length to seconds at the device format', () => {
    expect(pcmDurationSeconds(32000, FORMAT)).toBe(1);
    expect(pcmDurationSeconds(96000, FORMAT)).toBe(3);
    expect(pcmDurationSeconds(0, FORMAT)).toBe(0);
  });
});

describe('peakLevel', () => {
  it('reports silence as zero', () => {
    expect(peakLevel(pcm(0.1, 0))).toBe(0);
  });

  it('reports full scale as ~1', () => {
    expect(peakLevel(pcm(0.1, 32767))).toBeCloseTo(1, 2);
  });

  it('measures magnitude regardless of sign', () => {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(-20000, 0);
    buf.writeInt16LE(100, 2);
    expect(peakLevel(buf)).toBeCloseTo(20000 / 32768, 4);
  });

  it('ignores a trailing odd byte rather than reading past the end', () => {
    const buf = Buffer.alloc(3);
    buf.writeInt16LE(5000, 0);
    expect(() => peakLevel(buf)).not.toThrow();
    expect(peakLevel(buf)).toBeCloseTo(5000 / 32768, 4);
  });
});
