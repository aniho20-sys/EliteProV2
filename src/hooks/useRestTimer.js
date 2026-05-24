import { useState, useRef, useEffect, useCallback } from 'react';

export function useRestTimer({ stopWhen = false } = {}) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);
  const timerRef = useRef(null);

  // Primary: <audio> element — more reliable than Web Audio on iOS (bypasses silent-mode in most cases)
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  // Fallback: Web Audio API (kept for browsers without <audio> support)
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audio = new Audio('/sounds/timer-done.wav');
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => { audioRef.current = null; };
  }, []);

  // iOS/Android require a user-gesture to unlock <audio> for later non-gesture playback.
  // Call this inside any user-initiated handler (toggle, startTimer) to silently prime it.
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const prev = audio.volume;
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prev;
      audioUnlockedRef.current = true;
    }).catch(() => {
      // Unlock failed (no gesture context) — will try again on next interaction
    });

    // Also prime Web Audio fallback
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch { /* not available */ }
  }, []);

  useEffect(() => {
    if (stopWhen) {
      setTimerActive(false);
      clearInterval(timerRef.current);
    }
  }, [stopWhen]);

  const playWebAudioFallback = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const pattern = [
        { t: 0,    freq: 800,  dur: 0.13, gain: 0.6 },
        { t: 0.21, freq: 950,  dur: 0.13, gain: 0.65 },
        { t: 0.42, freq: 1150, dur: 0.13, gain: 0.7 },
        { t: 0.65, freq: 880,  dur: 0.4,  gain: 0.6 },
      ];
      pattern.forEach(({ t, freq, dur, gain }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + dur);
      });
    } catch { /* AudioContext not available */ }
  }, []);

  const playBeep = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1;
      audio.play().catch(() => playWebAudioFallback());
    } else {
      playWebAudioFallback();
    }
  }, [playWebAudioFallback]);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          playBeep();
          if ('vibrate' in navigator) navigator.vibrate([100, 80, 100, 80, 100, 150, 400]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, playBeep]);

  const toggleTimer = useCallback(() => {
    unlockAudio();
    setTimeLeft(prev => {
      if (prev === 0) {
        setTimerActive(true);
        return restSeconds;
      }
      setTimerActive(p => !p);
      return prev;
    });
  }, [restSeconds, unlockAudio]);

  const resetTimer = useCallback(() => {
    setTimerActive(false);
    setTimeLeft(restSeconds);
  }, [restSeconds]);

  const startTimer = useCallback((duration) => {
    unlockAudio();
    const dur = duration || restSeconds;
    setRestSeconds(dur);
    setTimeLeft(dur);
    setTimerActive(true);
  }, [restSeconds, unlockAudio]);

  const startEditTimer = useCallback(() => {
    if (timerActive) return;
    setTimerMins(Math.floor(restSeconds / 60));
    setTimerSecs(restSeconds % 60);
    setTimerEditing(true);
  }, [timerActive, restSeconds]);

  const applyTimerInput = useCallback((mins, secs) => {
    setTimerEditing(false);
    const total = Math.max(5, Math.min(3600, mins * 60 + secs));
    setRestSeconds(total);
    setTimeLeft(total);
    setTimerActive(false);
  }, []);

  const timerDisplay = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const timerDone = timeLeft === 0;
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
