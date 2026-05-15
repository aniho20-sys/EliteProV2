import { useState } from 'react';
import { parseLocalDate } from '../utils/dateUtils';

const LIMIT = 12;

export default function SessionDateList({ sessions }) {
  const [showAll, setShowAll] = useState(false);
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
                return <span key={date} className="session-date-chip">{label}</span>;
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
    </div>
  );
}
