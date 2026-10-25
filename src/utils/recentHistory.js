import { localDateAdd } from './dateUtils';

// How much of each client's history the coach's app keeps live (B76, load test
// 2026-10-24: 50 clients with a year each was 16,551 records and 114 listeners per open,
// 7.5 s to the dashboard from the phone's own cache). The dashboard and lists need only
// recent days; a client's page, the progress overview and analytics ask for the full
// history of the clients they show (watchClientHistory in AppContext).
//
// 60, not 28: the progress overview compares the last 30 days with the 30 before.
export const RECENT_DAYS = 60;
// Body stats are sparse (some clients measure monthly), so a count, not a date window.
export const RECENT_BODY_STATS = 10;

export const recentSince = () => localDateAdd(-RECENT_DAYS);

// The version of the summary functions/clientSummary.js writes on each client's doc (B76
// step 2). A summary of another version is treated as missing and rebuilt.
export const SUMMARY_VERSION = 1;
