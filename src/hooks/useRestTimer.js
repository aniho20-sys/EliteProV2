import { useState, useRef, useEffect, useCallback } from 'react';

export function useRestTimer({ stopWhen = false } = {}) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);

  const timerRef    = useRef(null);
  const endTimeRef  = useRef(null); // wall-clock ms when timer should complete

  // Web Audio — decode WAV into a buffer; play via BufferSource (most reliable on iOS)
  const audioCtxRef    = useRef(null);
  const audioBufferRef = useRef(null);

  // Called once during any user gesture to:
  // 1. Create/resume the AudioContext (satisfies iOS gesture requirement)
  // 2. Pre-fetch + decode the WAV into a reusable AudioBuffer
  const ensureAudioReady = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      if (!audioBufferRef.current) {
        fetch('/sounds/timer-done.wav')
          .then(r => r.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => { audioBufferRef.current = decoded; })
          .catch(() => {}); // silent — synthesised fallback handles missing file
      }
    } catch { /* AudioContext not available */ }
  }, []);

  // Synthesised beep pattern — fallback when WAV buffer is not ready
  const playSynthesised = useCallback((ctx) => {
    const pattern = [
      { t: 0,    freq: 800,  dur: 0.13, gain: 0.6 },
      { t: 0.21, freq: 950,  dur: 0.13, gain: 0.65 },
      { t: 0.42, freq: 1150, dur: 0.13, gain: 0.7 },
      { t: 0.65, freq: 880,  dur: 0.4,  gain: 0.6 },
    ];
    pattern.forEach(({ t, freq, dur, gain }) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur);
    });
  }, []);

  const playBeep = useCallback(() => {
    const ctx    = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx) return;

    const doPlay = () => {
      try {
        if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } else {
          playSynthesised(ctx);
        }
      } catch { /* ignore */ }
    };

    // iOS auto-suspends AudioContext after inactivity — always resume first
    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  }, [playSynthesised]);

  const fireComplete = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimerActive(false);
    setTimeLeft(0);
    playBeep();
    if ('vibrate' in navigator) navigator.vibrate([100, 80, 100, 80, 100, 150, 400]);
  }, [playBeep]);

  // Wall-clock tick — survives screen-off / throttled intervals
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        fireComplete();
      } else {
        setTimeLeft(remaining);
      }
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [timerActive, fireComplete]);

  // Page Visibility — sync immediately when screen unlocks / app foregrounds
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || !endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) fireComplete();
      else setTimeLeft(remaining);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fireComplete]);

  useEffect(() => {
    if (stopWhen) {
      clearInterval(timerRef.current);
      endTimeRef.current = null;
      setTimerActive(false);
    }
  }, [stopWhen]);

  const toggleTimer = useCallback(() => {
    ensureAudioReady();
    setTimerActive(prev => {
      if (prev) {
        endTimeRef.current = null;
        return false;
      }
      setTimeLeft(tl => {
        const secs = tl === 0 ? restSeconds : tl;
        endTimeRef.current = Date.now() + secs * 1000;
        if (tl === 0) setTimeout(() => setTimeLeft(restSeconds), 0);
        return tl === 0 ? restSeconds : tl;
      });
      return true;
    });
  }, [restSeconds, ensureAudioReady]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimerActive(false);
    setTimeLeft(restSeconds);
  }, [restSeconds]);

  const startTimer = useCallback((duration) => {
    ensureAudioReady();
    const dur = duration || restSeconds;
    endTimeRef.current = Date.now() + dur * 1000;
    setRestSeconds(dur);
    setTimeLeft(dur);
    setTimerActive(true);
  }, [restSeconds, ensureAudioReady]);

  const startEditTimer = useCallback(() => {
    if (timerActive) return;
    setTimerMins(Math.floor(restSeconds / 60));
    setTimerSecs(restSeconds % 60);
    setTimerEditing(true);
  }, [timerActive, restSeconds]);

  const applyTimerInput = useCallback((mins, secs) => {
    setTimerEditing(false);
    const total = Math.max(5, Math.min(3600, mins * 60 + secs));
    endTimeRef.current = null;
    setRestSeconds(total);
    setTimeLeft(total);
    setTimerActive(false);
  }, []);

  const timerDisplay  = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const timerDone     = timeLeft === 0;
  const timerStarted  = timeLeft < restSeconds || timerActive;

  return {
    restSeconds, setRestSeconds,
    timeLeft, setTimeLeft,
    timerActive,
    timerEditing, setTimerEditing,
    timerMins, setTimerMins,
    timerSecs, setTimerSecs,
    timerDisplay, timerDone, timerStarted,
    toggleTimer, resetTimer, startTimer,
    startEditTimer, applyTimerInput,
  };
}
