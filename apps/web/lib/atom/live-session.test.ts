import { describe, it, expect, vi } from 'vitest';

// Only the pure helpers are exercised; keep the agent (and Firebase) out.
vi.mock('@/lib/agent/booking-agent', () => ({ runBookingAgent: vi.fn() }));

import { buildVoiceInstructions, historyToInput, isVoiced, peak, toSpeakable } from './live-session';

function pcmOf(...samples: number[]): Buffer {
  const b = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => b.writeInt16LE(s, i * 2));
  return b;
}

describe('toSpeakable', () => {
  it('flattens the agent’s markdown into sentences', () => {
    const md = 'Tomorrow you have:\n- **10:00** — Laura, 1.5 Hour Facial\n- **12:30** — Ana, INDIBA';
    expect(toSpeakable(md)).toBe('Tomorrow you have: 10:00, Laura, 1.5 Hour Facial. 12:30, Ana, INDIBA');
  });

  it('caps long answers well under the commentary limit', () => {
    expect(toSpeakable('word '.repeat(1000)).length).toBeLessThanOrEqual(900);
  });
});

describe('peak / isVoiced', () => {
  it('treats the model’s idle output as silence', () => {
    expect(isVoiced(pcmOf(0, 12, -30, 200))).toBe(false);
  });

  it('detects speech', () => {
    expect(isVoiced(pcmOf(0, 9000, -12000))).toBe(true);
    expect(peak(pcmOf(-32768))).toBe(1);
  });
});

describe('historyToInput', () => {
  it('maps each side to the item shape GPT-Live expects', () => {
    expect(
      historyToInput([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué te ayudo?' },
      ])
    ).toEqual([
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hola' }] },
      { type: 'message', role: 'assistant', content: [{ type: 'text', text: '¿En qué te ayudo?' }] },
    ]);
  });
});

describe('buildVoiceInstructions', () => {
  const text = buildVoiceInstructions(['After Summer Facial', '45 Minutes Facial']);

  it('names the real services so brand names are heard correctly', () => {
    expect(text).toContain('After Summer Facial');
    expect(text).toContain('INDIBA');
  });

  it('answers to Olivia and ignores its own name at the start of a question', () => {
    expect(text).toContain('Hola Olivia');
    expect(text).toMatch(/not the question/);
  });

  it('keeps clients to their first name', () => {
    expect(text).toMatch(/first name/);
  });
});
