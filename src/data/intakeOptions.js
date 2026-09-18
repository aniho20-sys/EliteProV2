// Intake answers. `value` is what is written to Firestore and must never change — it is
// stored data (#27/#39), and a trainer reading an older intake form must still see the
// same answer. `label` is what the client reads, so it is a function of t, since t() only
// accepts a literal key.
export const GOALS = [
  { value: 'Weight Loss',          label: (t) => t('intake.goal_weight_loss') },
  { value: 'Muscle Gain',          label: (t) => t('intake.goal_muscle_gain') },
  { value: 'Improve Fitness',      label: (t) => t('intake.goal_fitness') },
  { value: 'Athletic Performance', label: (t) => t('intake.goal_athletic') },
];

// '1x'…'4x' read the same in both languages; only the open-ended last option is a phrase.
export const FREQUENCIES = [
  { value: '1x',          label: () => '1x' },
  { value: '2x',          label: () => '2x' },
  { value: '3x',          label: () => '3x' },
  { value: '4x',          label: () => '4x' },
  { value: '5x or more',  label: (t) => t('intake.freq_5_plus') },
];

export const EXPERIENCES = [
  { value: 'Beginner',     label: (t) => t('intake.exp_beginner') },
  { value: 'Intermediate', label: (t) => t('intake.exp_intermediate') },
  { value: 'Advanced',     label: (t) => t('intake.exp_advanced') },
];
