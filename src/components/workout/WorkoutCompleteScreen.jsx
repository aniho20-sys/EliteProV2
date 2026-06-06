import { useState } from 'react';
import { CheckCircle, Trophy, Share2 } from 'lucide-react';

const CLOSING_MESSAGES = [
  'Every rep builds the best version of you.',
  'Consistency is what transforms average into excellence.',
  'You showed up. That\'s already winning.',
  'Progress, not perfection.',
  'Strong today. Stronger tomorrow.',
  'The only bad workout is the one that didn\'t happen.',
];

const buildShareText = (data, msg) => {
  const stats = data.totalVolume > 0
    ? `${data.totalVolume.toLocaleString()} kg total volume · ${data.exerciseCount} exercises · RPE ${data.rpe}/10`
    : `${data.totalSets} sets · ${data.exerciseCount} exercises · RPE ${data.rpe}/10`;

  const lines = [
    `💪 Workout Complete — ${data.planName}`,
    `📊 ${stats}`,
  ];
  if (data.newPRs?.length > 0) {
    lines.push(`🏆 New PRs: ${data.newPRs.map(pr => `${pr.name} ${pr.weight}kg`).join(', ')}`);
  }
  lines.push('', `"${msg}"`, '— Logged with ElitePro');
  return lines.join('\n');
};

export default function WorkoutCompleteScreen({ data, onDone }) {
  const [msg] = useState(() => CLOSING_MESSAGES[Math.floor(Math.random() * CLOSING_MESSAGES.length)]);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(data, msg);
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
