import { useState } from 'react';
import { parseLocalDate } from '../utils/dateUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { formatSet, calcVolume, calcSetCount } from '../utils/workoutUtils';

const LIMIT = 12;

export default function SessionDateList({ sessions, logs = [], exerciseLibrary = [], plans = [] }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const visible = showAll ? sessions : sessions.slice(0, LIMIT);
  const groups = visible.reduce((acc, s) => {
    const [y, m] = s.date.split('-');
    const key = `${y}-${m}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s.date);
    return acc;
  }, {});

  if (sessions.length === 0) {
    return <p className="text-sm text-muted">No completed sessions yet.</p>;
  }

  const selectedLogs = selectedDate ? logs.filter(l => l.date === selectedDate) : [];

  return (
    <div className="session-date-groups">
      {Object.entries(groups).map(([key, dates]) => {
        const [y, m] = key.split('-');
        const monthLabel = new Date(parseInt(y), parseInt(m) - 1, 1)
          .toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return (
          <div key={key} className="session-date-group">
            <div className="session-date-month">{monthLabel}</div>
            <div className="session-date-chips">
              {dates.map(date => {
                const d = parseLocalDate(date);
                const label = d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <button key={date} type="button" className="session-date-chip" onClick={() => setSelectedDate(date)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {sessions.length > LIMIT && (
        <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show recent only' : `Show all ${sessions.length} sessions`}
        </button>
      )}

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {parseLocalDate(selectedDate).toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            {selectedLogs.length === 0 ? (
              <p className="text-sm text-muted">No workout logged for this date.</p>
            ) : (
              selectedLogs.map(l => {
                const plan = plans.find(p => p.id === l.planId);
                const planName = plan?.name || l.workoutName || 'Custom Workout';
                const totalVolume = calcVolume(l.entries);
                const totalSets = calcSetCount(l.entries);
                return (
                  <div key={l.id} className="mb-16">
                    <div className="flex-between mb-8" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <span className="fw-bold">{planName}</span>
                      <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                        {!l.planId && <span className="tag">Custom</span>}
                        {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? 'PT Session' : 'Self'}</span>}
                        {l.rpe && <span className="tag tag-primary">RPE: {l.rpe}/10</span>}
                        <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? 'Completed' : 'Partial'}</span>
                      </div>
                    </div>
                    <div className="log-session-stats">
                      {totalVolume > 0 && (
                        <div className="log-stat-item">
                          <span className="log-stat-value">{totalVolume.toLocaleString()}<span className="log-stat-unit">kg</span></span>
                          <span className="log-stat-label">Total Volume</span>
                        </div>
                      )}
                      <div className="log-stat-item">
                        <span className="log-stat-value">{totalSets}</span>
                        <span className="log-stat-label">Sets</span>
                      </div>
                      <div className="log-stat-item">
                        <span className="log-stat-value">{(l.entries || []).length}</span>
                        <span className="log-stat-label">Exercises</span>
                      </div>
                    </div>
                    {(l.entries || []).map((entry, i) => {
                      const skipped = !entry.sets || entry.sets.length === 0;
                      return (
                        <div key={i} className={`plan-exercise ${skipped ? 'plan-exercise-skipped' : ''}`}>
                          <span className="plan-exercise-name">{entry.name || resolveExerciseName(exerciseLibrary, entry.exerciseId, 'Exercise')}</span>
                          <span className="plan-exercise-detail">
                            {skipped ? '—' : entry.sets.map(s => formatSet(s, entry.unit || 'weight_reps')).join(' | ')}
                          </span>
                        </div>
                      );
                    })}
                    {l.notes && <p className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{l.notes}</p>}
                    {l.trainerNotes && (
                      <div className="trainer-note-readonly">
                        <span className="trainer-note-label">Coach</span>
                        <span className="trainer-note-text">{l.trainerNotes}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedDate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
