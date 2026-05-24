import { useState, useRef, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'elitepro_rest_timer';

function saveTimer(endTime, restSecs) {
  try {
    if (endTime) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime, restSecs }));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore quota errors */ }
}

function loadTimer() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { endTime, restSecs } = JSON.parse(raw);
    const remaining = Math.ceil((endTime - Date.now()) / 1000);
    if (remaining > 0) return { endTime, restSecs, remaining };
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  } catch { return null; }
}

export function useRestTimer({ stopWhen = false } = {}) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);

  const timerRef    = useRef(null);
  const endTimeRef  = useRef(null);
  const audioCtxRef = useRef(null);
  const audioBufferRef = useRef(null);
  // Raw ArrayBuffer fetched eagerly on mount; decoded into audioBufferRef on first gesture
  const rawWavRef   = useRef(null);

  // Fetch WAV bytes immediately on mount — no gesture required for fetch
  useEffect(() => {
    fetch('/sounds/timer-done.wav')
      .then(r => r.arrayBuffer())
      .then(buf => { rawWavRef.current = buf; })
      .catch(() => {});
  }, []);

  // Called on every user gesture that interacts with the timer.
  // Creates AudioContext, resumes it, and decodes the WAV into a reusable buffer.
  const ensureAudioReady = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      // Decode using callback form — widest iOS compat
      if (!audioBufferRef.current && rawWavRef.current) {
        const raw = rawWavRef.current;
        rawWavRef.current = null;
        ctx.decodeAudioData(raw,
          decoded => { audioBufferRef.current = decoded; },
          () => {}
        );
      }
    } catch { /* AudioContext not supported */ }
  }, []);

  // iOS keep-alive: play a 1-sample silent buffer every 20 s while timer runs.
  // Without this, iOS suspends AudioContext after ~30 s of silence, making
  // ctx.resume() fail when called from a non-gesture context (timer callback).
  useEffect(() => {
    if (!timerActive) return;
    const keepAlive = setInterval(() => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignore */ }
    }, 20000);
    return () => clearInterval(keepAlive);
  }, [timerActive]);

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
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.start(0);
        } else {
          playSynthesised(ctx);
        }
      } catch { /* ignore */ }
    };
    // With the keep-alive running, ctx should already be 'running'.
    // The resume() here is a safety net for edge cases.
    if (ctx.state === 'suspended') ctx.resume().then(doPlay).catch(() => {});
    else doPlay();
  }, [playSynthesised]);

  const fireComplete = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    saveTimer(null);
    setTimerActive(false);
    setTimeLeft(0);
    playBeep();
    if ('vibrate' in navigator) navigator.vibrate([100, 80, 100, 80, 100, 150, 400]);
  }, [playBeep]);

  // Restore timer from sessionStorage on mount (survives app kill + reopen)
  useEffect(() => {
    const saved = loadTimer();
    if (!saved) return;
    endTimeRef.current = saved.endTime;
    setRestSeconds(saved.restSecs);
    setTimeLeft(saved.remaining);
    setTimerActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wall-clock tick — correct after throttled/suspended intervals
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) fireComplete();
      else setTimeLeft(remaining);
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [timerActive, fireComplete]);

  // Re-sync on wake: visibilitychange + focus + pageshow cover different iOS/Android scenarios
  useEffect(() => {
    const sync = () => {
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) fireComplete();
      else setTimeLeft(remaining);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [fireComplete]);

  useEffect(() => {
    if (stopWhen) {
      clearInterval(timerRef.current);
      endTimeRef.current = null;
      saveTimer(null);
      setTimerActive(false);
    }
  }, [stopWhen]);

  const toggleTimer = useCallback(() => {
    ensureAudioReady();
    setTimerActive(prev => {
      if (prev) {
        clearInterval(timerRef.current);
        endTimeRef.current = null;
        saveTimer(null);
        return false;
      }
      setTimeLeft(tl => {
        const secs = tl === 0 ? restSeconds : tl;
        const endTime = Date.now() + secs * 1000;
        endTimeRef.current = endTime;
        saveTimer(endTime, secs);
        if (tl === 0) setTimeout(() => setTimeLeft(restSeconds), 0);
        return tl === 0 ? restSeconds : tl;
      });
      return true;
    });
  }, [restSeconds, ensureAudioReady]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    saveTimer(null);
    setTimerActive(false);
    setTimeLeft(restSeconds);
  }, [restSeconds]);

  const startTimer = useCallback((duration) => {
    ensureAudioReady();
    const dur = duration || restSeconds;
    const endTime = Date.now() + dur * 1000;
    endTimeRef.current = endTime;
    saveTimer(endTime, dur);
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
    saveTimer(null);
    setRestSeconds(total);
    setTimeLeft(total);
    setTimerActive(false);
  }, []);

  const timerDisplay = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const timerDone    = timeLeft === 0;
  const timerStarted = timeLeft < restSeconds || timerActive;

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
