import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import restBeep from '../data/restBeep.json';

// Ani 2026-10-10: the rest timer ends with two beeps. The shipped WAV is generated from
// data/restBeep.json by scripts/generate-beep.cjs, so this reads the WAV itself — a pattern
// changed without regenerating the file (or the reverse) fails here.
function beepsInWav(path) {
  const buf = readFileSync(path);
  const rate = buf.readUInt32LE(24);
  const dataStart = 44;
  const n = (buf.length - dataStart) / 2;
  const windowSize = Math.round(rate * 0.01); // 10 ms
  const loud = [];
  for (let i = 0; i < n; i += windowSize) {
    let peak = 0;
    for (let j = i; j < Math.min(i + windowSize, n); j++) peak = Math.max(peak, Math.abs(buf.readInt16LE(dataStart + j * 2)));
    loud.push(peak > 3000);
  }
  // Count runs of sound separated by at least 50 ms of silence.
  let beeps = 0; let quiet = Infinity;
  for (const isLoud of loud) {
    if (isLoud) { if (quiet >= 5) beeps += 1; quiet = 0; } else quiet += 1;
  }
  return beeps;
}

describe('the rest timer finish sound', () => {
  test('is two beeps, in the pattern and in the shipped WAV', () => {
    expect(restBeep.tones).toHaveLength(2);
    expect(beepsInWav(join(cwd(), 'public/sounds/timer-done.wav'))).toBe(2);
  });

  test('the phone buzzes twice to match', () => {
    // [on, off, on]
    expect(restBeep.vibrate).toHaveLength(3);
  });
});
