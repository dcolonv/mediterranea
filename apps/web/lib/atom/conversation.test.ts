import { describe, it, expect, vi } from 'vitest';

// The Firestore helpers are not exercised here; stub the admin module so
// importing the file doesn't try to initialise Firebase.
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: vi.fn() }));

import { isResetCommand, isValidSessionId, normalize, trimHistory } from './conversation';
import type { AgentMessage } from '@/lib/agent/booking-agent';

describe('isValidSessionId', () => {
  it('accepts the 16-hex-char ids the firmware generates', () => {
    expect(isValidSessionId('0a1b2c3d4e5f6789')).toBe(true);
  });

  it('rejects anything that could reach into another Firestore path', () => {
    for (const bad of [
      '',
      null,
      undefined,
      '0A1B2C3D4E5F6789', // uppercase
      '0a1b2c3d4e5f678', // too short
      '0a1b2c3d4e5f67890', // too long
      '../../customers/x',
      'abc/def0123456789',
    ]) {
      expect(isValidSessionId(bad as string)).toBe(false);
    }
  });
});

describe('normalize', () => {
  it('folds case, accents and punctuation the way transcripts vary them', () => {
    expect(normalize('¡Nueva Conversación!')).toBe('nueva conversacion');
    expect(normalize('  Start   over.  ')).toBe('start over');
  });
});

describe('isResetCommand', () => {
  it('recognises the command in Spanish and English', () => {
    for (const phrase of [
      'Nueva conversación.',
      'Empezar de nuevo',
      'Olvida todo',
      'New conversation.',
      'Start over',
      'Forget everything!',
    ]) {
      expect(isResetCommand(phrase)).toBe(true);
    }
  });

  it('allows a little politeness around the command', () => {
    expect(isResetCommand('Start over, please.')).toBe(true);
    expect(isResetCommand('Vale, nueva conversación por favor')).toBe(true);
  });

  it('does not hijack a real question that happens to contain the phrase', () => {
    expect(isResetCommand("I'd like to start over my facial plan next week")).toBe(false);
    expect(isResetCommand('Quiero empezar de nuevo con el tratamiento de la semana que viene')).toBe(false);
  });

  it('ignores ordinary requests', () => {
    expect(isResetCommand('¿Qué citas hay mañana?')).toBe(false);
    expect(isResetCommand('What is booked on Friday?')).toBe(false);
    expect(isResetCommand('')).toBe(false);
  });
});

describe('trimHistory', () => {
  const turn = (i: number): AgentMessage[] => [
    { role: 'user', content: `q${i}` },
    { role: 'assistant', content: `a${i}` },
  ];

  it('leaves a short history untouched', () => {
    const h = [...turn(1), ...turn(2)];
    expect(trimHistory(h, 20)).toEqual(h);
  });

  it('keeps only the most recent turns', () => {
    const h = [1, 2, 3, 4, 5].flatMap(turn); // 10 messages
    const out = trimHistory(h, 4);
    expect(out.map((m) => m.content)).toEqual(['q4', 'a4', 'q5', 'a5']);
  });

  it('never starts on an orphaned assistant reply', () => {
    const h = [1, 2, 3].flatMap(turn); // 6 messages
    const out = trimHistory(h, 3); // naive slice would begin with 'a2'
    expect(out[0].role).toBe('user');
    expect(out.map((m) => m.content)).toEqual(['q3', 'a3']);
  });
});
