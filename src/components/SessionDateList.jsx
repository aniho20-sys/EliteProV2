import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMonthYear, formatShortDate, formatFullDate } from '../i18n/format';
import { resolveExerciseName } from '../utils/exerciseUtils';
import { formatSet, calcVolume, calcSetCount } from '../utils/workoutUtils';

const LIMIT = 12;

export default function SessionDateList({ sessions, logs = [], exerciseLibrary = [], plans = [] }) {
  const { t, lang } = useLanguage();
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
    return <p className="text-sm text-muted">{t('sessions.none_completed')}</p>;
  }

  const selectedLogs = selectedDate ? logs.filter(l => l.date === selectedDate) : [];

  return (
    <div className="session-date-groups">
      {Object.entries(groups).map(([key, dates]) => {
        const monthLabel = formatMonthYear(`${key}-01`, lang);
        return (
          <div key={key} className="session-date-group">
            <div className="session-date-month">{monthLabel}</div>
            <div className="session-date-chips">
              {dates.map(date => {
                const label = formatShortDate(date, lang);
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
          {showAll ? t('sessions.show_recent') : t('sessions.show_all', { count: sessions.length })}
        </button>
      )}

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {formatFullDate(selectedDate, lang)}
            </h3>
            {selectedLogs.length === 0 ? (
              <p className="text-sm text-muted">{t('sessions.no_log_that_day')}</p>
            ) : (
              selectedLogs.map(l => {
                const plan = plans.find(p => p.id === l.planId);
                const planName = plan?.name || l.workoutName || t('sessions.custom_workout');
                const totalVolume = calcVolume(l.entries);
                const totalSets = calcSetCount(l.entries);
                return (
                  <div key={l.id} className="mb-16">
                    <div className="flex-between mb-8" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <span className="fw-bold">{planName}</span>
                      <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                        {!l.planId && <span className="tag">{t('sessions.tag_custom')}</span>}
                        {l.logType && <span className={`tag ${l.logType === 'pt_session' ? 'tag-accent' : ''}`}>{l.logType === 'pt_session' ? t('sessions.tag_pt') : t('sessions.tag_self')}</span>}
                        {l.rpe && <span className="tag tag-primary">RPE: {l.rpe}/10</span>}
                        <span className={`tag ${l.completed ? 'tag-accent' : 'tag-warning'}`}>{l.completed ? t('sessions.tag_completed') : t('sessions.tag_partial')}</span>
                      </div>
                    </div>
                    <div className="log-session-stats">
                      {totalVolume > 0 && (
                        <div className="log-stat-item">
                          <span className="log-stat-value">{totalVolume.toLocaleString()}<span className="log-stat-unit">kg</span></span>
                          <span className="log-stat-label">{t('sessions.total_volume')}</span>
                        </div>
                      )}
                      <div className="log-stat-item">
                        <span className="log-stat-value">{totalSets}</span>
                        <span className="log-stat-label">Sets</span>
                      </div>
                      <div className="log-stat-item">
                        <span className="log-stat-value">{(l.entries || []).length}</span>
                        <span className="log-stat-label">{t('sessions.exercises_label')}</span>
                      </div>
                    </div>
                    {(l.entries || []).map((entry, i) => {
                      const skipped = !entry.sets || entry.sets.length === 0;
                      return (
                        <div key={i} className={`plan-exercise ${skipped ? 'plan-exercise-skipped' : ''}`}>
                          <span className="plan-exercise-name">{resolveExerciseName(exerciseLibrary, entry.exerciseId, entry.name || 'Exercise')}</span>
                          <span className="plan-exercise-detail">
                            {skipped ? '—' : entry.sets.map(s => formatSet(s, entry.unit || 'weight_reps')).join(' | ')}
                          </span>
                        </div>
                      );
                    })}
                    {l.notes && <p className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{l.notes}</p>}
                    {l.trainerNotes && (
                      <div className="trainer-note-readonly">
                        <span className="trainer-note-label">{t('sessions.coach')}</span>
                        <span className="trainer-note-text">{l.trainerNotes}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedDate(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
