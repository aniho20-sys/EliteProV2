// Body-composition metrics. `label` is a function of t rather than a string, because t()
// only accepts a literal key (#39) and this array is module-level, outside any component.
// Same shape as EX_METRICS in ExerciseProgress and SORT_LABELS in
// ClientProgressOverviewPage.
export const METRICS = [
  { key: 'weight',  label: (t) => t('metric.weight'),   unit: 'kg', color: '#FF6B35' },
  { key: 'bodyFat', label: (t) => t('metric.body_fat'), unit: '%',  color: '#ef476f' },
  { key: 'chest',   label: (t) => t('metric.chest'),    unit: 'cm', color: '#06d6a0' },
  { key: 'waist',   label: (t) => t('metric.waist'),    unit: 'cm', color: '#d4900a' },
  { key: 'arms',    label: (t) => t('metric.arms'),     unit: 'cm', color: '#0e7bb5' },
  { key: 'legs',    label: (t) => t('metric.legs'),     unit: 'cm', color: '#8338ec' },
];

export const EMPTY_STAT_FORM = { weight: '', bodyFat: '', chest: '', waist: '', hips: '', arms: '', legs: '' };
