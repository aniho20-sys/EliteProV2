import { useState } from 'react';
import { CheckCircle, Trophy, Share2 } from 'lucide-react';
import { pickClosingMessage, buildWorkoutShareText } from '../../utils/workoutShareUtils';

export default function WorkoutCompleteScreen({ data, onDone }) {
  const [msg] = useState(pickClosingMessage);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildWorkoutShareText(data, msg);
    if (navigator.share) {
      try { await navigator.share({ title: 'Workout Complete', text }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* clipboard unavailable */ }
    }
  };

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

      <div className="workout-complete-actions">
        <button className="btn btn-outline" onClick={handleShare}>
          <Share2 size={16} />
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button className="btn btn-accent" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
