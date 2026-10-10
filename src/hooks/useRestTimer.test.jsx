// @vitest-environment jsdom
//
// The rest timer must be heard with the iPhone's silent switch on (Ani 2026-10-10: she
// trains with it on and had never heard the timer). Web audio on iPhone obeys the switch
// unless the page asks for the 'playback' audio session.

import { describe, test, expect, vi, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { useRestTimer } from './useRestTimer';

class FakeAudioContext {
  constructor() { FakeAudioContext.created.push(navigator.audioSession?.type); this.state = 'running'; this.sampleRate = 44100; this.destination = {}; this.currentTime = 0; }
  createBuffer() { return {}; }
  createBufferSource() { return { connect() {}, start() {} }; }
  resume() { return Promise.resolve(); }
  decodeAudioData() {}
}
FakeAudioContext.created = [];

const latest = { timer: null };
function Harness() {
  const timerState = useRestTimer({});
  useEffect(() => { latest.timer = timerState; });
  return null;
}

afterEach(() => { cleanup(); delete navigator.audioSession; FakeAudioContext.created = []; });

describe('the rest timer and the silent switch', () => {
  test('asks for the playback audio session before it makes any sound', () => {
    window.AudioContext = FakeAudioContext;
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    navigator.audioSession = { type: 'auto' };
    render(<Harness />);
    act(() => latest.timer.startTimer(60));
    expect(navigator.audioSession.type).toBe('playback');
    expect(FakeAudioContext.created).toEqual(['playback']); // set first, then the context
  });

  test('a browser without the API still starts the timer', () => {
    window.AudioContext = FakeAudioContext;
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    render(<Harness />);
    act(() => latest.timer.startTimer(60));
    expect(latest.timer.timerActive).toBe(true);
  });
});
