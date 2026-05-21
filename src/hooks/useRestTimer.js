import { useState, useRef, useEffect, useCallback } from 'react';

export function useRestTimer({ stopWhen = false } = {}) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEditing, setTimerEditing] = useState(false);
  const [timerMins, setTimerMins] = useState(1);
  const [timerSecs, setTimerSecs] = useState(30);
  const timerRef = useRef(null);

  useEffect(() => {
    if (stopWhen) {
      setTimerActive(false);
      clearInterval(timerRef.current);
    }
  }, [stopWhen]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const pattern = [
        { t: 0,    freq: 880, dur: 0.12, gain: 0.6 },
        { t: 0.18, freq: 880, dur: 0.12, gain: 0.6 },
        { t: 0.36, freq: 880, dur: 0.12, gain: 0.6 },
        { t: 0.6,  freq: 660, dur: 0.4,  gain: 0.7 },
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
    setTimeLeft(prev => {
      if (prev === 0) {
        setTimerActive(true);
        return restSeconds;
      }
      setTimerActive(p => !p);
      return prev;
    });
  }, [restSeconds]);

  const resetTimer = useCallback(() => {
    setTimerActive(false);
    setTimeLeft(restSeconds);
  }, [restSeconds]);

  // Called when a set is marked complete — starts timer with the exercise rest duration
  const startTimer = useCallback((duration) => {
    const dur = duration || restSeconds;
    setRestSeconds(dur);
    setTimeLeft(dur);
    setTimerActive(true);
  }, [restSeconds]);

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
