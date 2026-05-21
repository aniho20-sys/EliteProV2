import { useState } from 'react';
import { CheckCircle, Trophy } from 'lucide-react';

const CLOSING_MESSAGES = [
  'Every rep builds the best version of you.',
  'Consistency is what transforms average into excellence.',
  'You showed up. That\'s already winning.',
  'Progress, not perfection.',
  'Strong today. Stronger tomorrow.',
  'The only bad workout is the one that didn\'t happen.',
];

export default function WorkoutCompleteScreen({ data, onDone }) {
  const [msg] = useState(() => CLOSING_MESSAGES[Math.floor(Math.random() * CLOSING_MESSAGES.length)]);
  return (
    <div className="workout-complete">
      <div className="workout-complete-check">
        <CheckCircle size={64} strokeWidth={1.5} />
      </div>
      <h1 className="workout-complete-title">Workout Complete</h1>
      <p className="workout-complete-plan">{data.planName}</p>

      <div className="workout-complete-stats">
        {data.totalVolume > 0 ? (
          <div className="workout-complete-stat">
            <div className="workout-complete-stat-value">{data.totalVolume.toLocaleString()}</div>
            <div className="workout-complete-stat-label">Volume (kg)</div>
          </div>
        ) : (
          <div className="workout-complete-stat">
            <div className="workout-complete-stat-value">{data.totalSets}</div>
            <div className="workout-complete-stat-label">Sets</div>
          </div>
        )}
        <div className="workout-complete-stat">
          <div className="workout-complete-stat-value">{data.exerciseCount}</div>
          <div className="workout-complete-stat-label">Exercises</div>
        </div>
        <div className="workout-complete-stat">
          <div className="workout-complete-stat-value">{data.rpe}/10</div>
          <div className="workout-complete-stat-label">RPE</div>
        </div>
      </div>

      {data.newPRs?.length > 0 && (
        <div className="workout-complete-prs">
          <div className="workout-complete-prs-title">
            <Trophy size={15} /> New Personal Records
          </div>
          {data.newPRs.map(pr => (
            <div key={pr.exerciseId} className="workout-complete-pr-item">
              <span>{pr.name}</span>
              <span className="fw-bold">{pr.weight}kg</span>
            </div>
          ))}
        </div>
      )}
      <p className="workout-complete-quote">&ldquo;{msg}&rdquo;</p>
      <button className="btn btn-accent" onClick={onDone} style={{ width: '100%' }}>
        Done
      </button>
    </div>
  );
}
