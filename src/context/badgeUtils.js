import { localToday } from '../utils/dateUtils';

export const BADGE_MILESTONES = [
  { id: 'first_session', name: 'First Step',   icon: '🏃', threshold: 1   },
  { id: 'sessions_10',   name: '10 Sessions',  icon: '🔥', threshold: 10  },
  { id: 'sessions_50',   name: '50 Sessions',  icon: '⚡', threshold: 50  },
  { id: 'sessions_100',  name: 'Century Club', icon: '🏆', threshold: 100 },
];

export function getNewBadges(existingBadges, sessionCount) {
  const existingIds = new Set(existingBadges.map(b => b.id));
  const awardedAt = localToday();
  return BADGE_MILESTONES
    .filter(m => sessionCount >= m.threshold && !existingIds.has(m.id))
    .map(b => ({ id: b.id, name: b.name, icon: b.icon, awardedAt }));
}
