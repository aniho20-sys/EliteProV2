import { useState, useEffect, useRef } from 'react';
import { Timer, RotateCcw } from 'lucide-react';

const PRESETS = [30, 45, 60, 90, 120, 180, 300];

function formatLabel(s) {
  if (s < 60) return `${s}s`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  } catch {}
}

export default function RestTimerPage() {
  const [duration, setDuration] = useState(90);
  const [timeLeft, setTimeLeft] = useState(90);
  const [active, setActive] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setActive(false);
          playBeep();
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const selectPreset = (s) => {
    setDuration(s);
    setActive(false);
    setTimeLeft(s);
  };

  const toggle = () => {
    if (timeLeft === 0) { setTimeLeft(duration); setActive(true); return; }
    setActive(p => !p);
  };

  const reset = () => { setActive(false); setTimeLeft(duration); };

  const done = timeLeft === 0;
  const started = timeLeft < duration || active;
  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, '0');
  const progress = duration > 0 ? timeLeft / duration : 1;
  const circumference = 2 * Math.PI * 110;

  return (
    <div className="rest-timer-page">
      <div className="page-header">
        <h1 className="page-title">
          <Timer size={22} />
          Rest Timer
        </h1>
      </div>

      {/* Circular progress ring */}
      <div className="rest-timer-ring-wrap">
        <svg className="rest-timer-ring" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="110" className="rest-timer-ring-track" />
          <circle
            cx="120" cy="120" r="110"
            className={`rest-timer-ring-fill${done ? ' done' : active ? ' active' : ''}`}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <div className={`rest-timer-ring-time${done ? ' done' : active ? ' active' : ''}`}>
          {mins}:{secs}
        </div>
      </div>

      {/* Preset pills */}
      <div className="rest-timer-presets">
        {PRESETS.map(s => (
          <button
            key={s}
            className={`rest-timer-preset-pill${duration === s && !active ? ' selected' : ''}`}
            onClick={() => selectPreset(s)}
            disabled={active}
          >
            {formatLabel(s)}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="rest-timer-controls">
        {started && !active && !done && (
          <button className="btn btn-outline" onClick={reset} title="Reset">
            <RotateCcw size={18} />
          </button>
        )}
        <button
          className={`btn rest-timer-main-btn${active ? ' btn-outline' : done ? ' btn-accent' : ' btn-primary'}`}
          onClick={toggle}
        >
          {active ? 'Pause' : done ? 'Restart' : started ? 'Resume' : 'Start'}
        </button>
        {(active || (started && !done)) && (
          <button className="btn btn-outline" onClick={reset} title="Reset">
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {done && (
        <p className="rest-timer-done-msg">Rest complete — go!</p>
      )}
    </div>
  );
}
