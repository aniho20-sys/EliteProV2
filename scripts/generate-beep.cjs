#!/usr/bin/env node
// Generates public/sounds/timer-done.wav from src/data/restBeep.json — the same tones the
// rest timer synthesises when the WAV is not available (hooks/useRestTimer.js).
// Pattern since 2026-10-10 (Ani): two short beeps at the same pitch.

const fs = require('fs');
const path = require('path');
const { tones } = require('../src/data/restBeep.json');

const SAMPLE_RATE = 44100;

// [startSec, durationSec, freqHz, peakGain]
const TONES = tones.map(({ t, dur, freq, gain }) => [t, dur, freq, gain]);

const totalDuration = Math.max(...TONES.map(([start, dur]) => start + dur)) + 0.05; // seconds
const numSamples = Math.floor(SAMPLE_RATE * totalDuration);

function envelope(t, start, dur) {
  const attack = 0.008;
  const release = 0.020;
  const pos = t - start;
  if (pos < 0 || pos >= dur) return 0;
  if (pos < attack) return pos / attack;
  if (pos > dur - release) return (dur - pos) / release;
  return 1;
}

const samples = new Int16Array(numSamples);
for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  let amp = 0;
  TONES.forEach(([start, dur, freq, gain]) => {
    const env = envelope(t, start, dur);
    amp += gain * env * Math.sin(2 * Math.PI * freq * t);
  });
  samples[i] = Math.max(-32767, Math.min(32767, Math.round(amp * 32767)));
}

// Build WAV
const dataBytes = numSamples * 2;
const buf = Buffer.alloc(44 + dataBytes);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);   // PCM
buf.writeUInt16LE(1, 22);   // mono
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataBytes, 40);
for (let i = 0; i < numSamples; i++) {
  buf.writeInt16LE(samples[i], 44 + i * 2);
}

const outPath = path.join(__dirname, '..', 'public', 'sounds', 'timer-done.wav');
fs.writeFileSync(outPath, buf);
console.log(`Generated ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
