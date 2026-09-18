// Closing lines for the post-workout screen and the share text.
//
// pickClosingKey returns a key rather than a sentence because t() only accepts a literal
// key (#39) — the caller maps the key through its own literal t() call. Keeping the list
// here rather than inlining it in the component keeps the two callers (the complete screen
// and WorkoutLogPage's share button) drawing from one list.
export const CLOSING_KEYS = [
  'wcomplete.quote_1',
  'wcomplete.quote_2',
  'wcomplete.quote_3',
  'wcomplete.quote_4',
  'wcomplete.quote_5',
  'wcomplete.quote_6',
];

export const pickClosingKey = () =>
  CLOSING_KEYS[Math.floor(Math.random() * CLOSING_KEYS.length)];

// Resolve a key from CLOSING_KEYS to its sentence. A switch of literal t() calls, because
// t(variable) is a lint error by design.
export const closingMessage = (t, key) => {
  switch (key) {
    case 'wcomplete.quote_2': return t('wcomplete.quote_2');
    case 'wcomplete.quote_3': return t('wcomplete.quote_3');
    case 'wcomplete.quote_4': return t('wcomplete.quote_4');
    case 'wcomplete.quote_5': return t('wcomplete.quote_5');
    case 'wcomplete.quote_6': return t('wcomplete.quote_6');
    default: return t('wcomplete.quote_1');
  }
};

// The share text follows the person sharing it, so it is built with their own t.
// Training vocabulary stays English inside it (#39): kg, sets, RPE, exercise names.
export const buildWorkoutShareText = (t, data, msg) => {
  const stats = data.totalVolume > 0
    ? `${data.totalVolume.toLocaleString()} kg ${t('wcomplete.share_volume')} · ${data.exerciseCount} ${t('wcomplete.share_exercises')} · RPE ${data.rpe}/10`
    : `${data.totalSets} sets · ${data.exerciseCount} ${t('wcomplete.share_exercises')} · RPE ${data.rpe}/10`;

  const lines = [
    `💪 ${t('wcomplete.title')} — ${data.planName}`,
    `📊 ${stats}`,
  ];
  if (data.newPRs?.length > 0) {
    lines.push(`🏆 ${t('wcomplete.share_new_prs')}: ${data.newPRs.map(pr => `${pr.name} ${pr.weight}kg`).join(', ')}`);
  }
  lines.push('', `"${msg}"`, `— ${t('wcomplete.share_footer')}`);
  return lines.join('\n');
};
