import { addDays } from './dateUtils';

// Which personal records the PR cards show (Ani 2026-10-10): only those set in the last 30
// days, newest first. Every exercise ever logged keeps one best weight, so a list of all of
// them only grows as a client trains more movements — and the point of the card is recent
// progress, not an archive. The full history per exercise stays in ExerciseProgress.
//
// `prs` is getPersonalRecords()'s { exerciseId: { weight, date, name } }; `today` is
// localToday(). The window includes today: 30 days = today and the 29 before it.
export const PR_WINDOW_DAYS = 30;

export function recentPersonalRecords(prs, today, days = PR_WINDOW_DAYS) {
  const from = addDays(today, -(days - 1));
  return Object.entries(prs || {})
    .filter(([, pr]) => pr?.date && pr.date >= from && pr.date <= today)
    .sort((a, b) => b[1].date.localeCompare(a[1].date));
}
