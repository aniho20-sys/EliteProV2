import { useState, useRef, useEffect, useCallback } from 'react';

export function useRestTimer({ stopWhen = false } = {}) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);

  const timerRef = useRef(null);
  // Wall-clock end time in ms — lets us sync correctly after screen-off / backgrounding
  const endTimeRef = useRef(null);

  // Primary: <audio> element — more reliable on iOS than Web Audio (less affected by silent mode)
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  // Fallback: Web Audio API
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audio = new Audio('/sounds/timer-done.wav');
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => { audioRef.current = null; };
  }, []);

  // Call inside any user-gesture handler to prime <audio> for later non-gesture playback (iOS)
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
    }).catch(() => {});
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    } catch { /* not available */ }
  }, []);

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

  const fireComplete = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimerActive(false);
    setTimeLeft(0);
    playBeep();
    if ('vibrate' in navigator) navigator.vibrate([100, 80, 100, 80, 100, 150, 400]);
  }, [playBeep]);

  // Wall-clock tick: derive remaining from absolute end time to survive throttled intervals
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
    }, 500); // 500ms poll — snappier display, still cheap
    return () => clearInterval(timerRef.current);
  }, [timerActive, fireComplete]);

  // Page Visibility API: screen unlocked / app foregrounded — immediately sync with wall clock.
  // This is the key handler for "timer expired while screen was off".
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (!endTimeRef.current) return;
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        fireComplete();
      } else {
        setTimeLeft(remaining);
      }
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
    unlockAudio();
    setTimerActive(prev => {
      if (prev) {
        // Pause — clear end time (timeLeft holds the frozen remaining)
        endTimeRef.current = null;
        return false;
      }
      // Start / resume — set end time from current timeLeft
      setTimeLeft(tl => {
        const secs = tl === 0 ? restSeconds : tl;
        endTimeRef.current = Date.now() + secs * 1000;
        if (tl === 0) {
          // full reset
          setTimeout(() => setTimeLeft(restSeconds), 0);
        }
        return tl === 0 ? restSeconds : tl;
      });
      return true;
    });
  }, [restSeconds, unlockAudio]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimerActive(false);
    setTimeLeft(restSeconds);
  }, [restSeconds]);

  const startTimer = useCallback((duration) => {
    unlockAudio();
    const dur = duration || restSeconds;
    endTimeRef.current = Date.now() + dur * 1000;
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
    endTimeRef.current = null;
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
