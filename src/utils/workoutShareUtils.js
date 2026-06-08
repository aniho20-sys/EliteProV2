const CLOSING_MESSAGES = [
  'Every rep builds the best version of you.',
  'Consistency is what transforms average into excellence.',
  'You showed up. That\'s already winning.',
  'Progress, not perfection.',
  'Strong today. Stronger tomorrow.',
  'The only bad workout is the one that didn\'t happen.',
];

export const pickClosingMessage = () =>
  CLOSING_MESSAGES[Math.floor(Math.random() * CLOSING_MESSAGES.length)];

export const buildWorkoutShareText = (data, msg) => {
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
