#!/usr/bin/env node
// Generates public/sounds/timer-done.wav
// Pattern: 3 ascending beeps (800→950→1150 Hz) + sustained fade-out tone
// Optimised to cut through gym ambient noise

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

// [startSec, durationSec, freqHz, peakGain]
const TONES = [
  [0.00, 0.13, 800,  0.75],
  [0.21, 0.13, 950,  0.80],
  [0.42, 0.13, 1150, 0.85],
  [0.65, 0.40, 880,  0.70],  // sustained finish tone
];

const totalDuration = 1.1; // seconds
const numSamples = Math.floor(SAMPLE_RATE * totalDuration);

function envelope(t, start, dur) {
  const attack = 0.008;
  const release = 0.020;
  const pos = t - start;
  if (pos < 0 || pos >= dur) return 0;
  if (pos < attack) return pos / attack;
  if (pos > dur - release) return (dur - pos) / release;
  // last tone: fade out over second half
  return 1;
}

function fadedEnvelope(t, start, dur) {
  const raw = envelope(t, start, dur);
  if (raw === 0) return 0;
  const pos = t - start;
  // linear fade out over full duration of the last tone
  return raw * (1 - (pos / dur) * 0.7);
}

const samples = new Int16Array(numSamples);
for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  let amp = 0;
  TONES.forEach(([start, dur, freq, gain], idx) => {
    const env = idx === TONES.length - 1
      ? fadedEnvelope(t, start, dur)
      : envelope(t, start, dur);
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
