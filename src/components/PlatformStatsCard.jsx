import { useState, useEffect } from 'react';
import { BarChart3, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SkeletonLine } from './Skeleton';

// Ani's own operating numbers, shown on her Profile and nobody else's.
//
// The gate that matters is inside the getPlatformStats Cloud Function, which checks the
// caller's email server-side. This component simply does not render for anyone else — a
// client-side check alone would be decoration, since a page anyone can open cannot keep
// its own secrets.
export default function PlatformStatsCard() {
  const { getPlatformStats } = useApp();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats()
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => {
        // permission-denied here means the signed-in account is not the owner, which is
        // the expected answer for everyone else — not something to shout about.
        if (!cancelled) setError(err?.code === 'functions/permission-denied' ? 'hidden' : 'failed');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error === 'hidden') return null;

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={18} /> Platform Stats
      </h3>
      <p className="invite-desc">Your own numbers — nobody else can see this card.</p>

      {error === 'failed' ? (
        <p className="mp-scan-note">Could not load stats. Pull down to refresh and try again.</p>
      ) : !stats ? (
        <div className="mt-8"><SkeletonLine /><SkeletonLine width="70%" /></div>
      ) : (
        <>
          <div className="stat-strip mt-8 mb-16">
            <div className="stat-pill">
              <div className="stat-pill-value">{stats.trainerCount}</div>
              <div className="stat-pill-label">Trainers</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{stats.clientCount}</div>
              <div className="stat-pill-label">Clients</div>
            </div>
            <div className="stat-pill">
              <Star size={15} style={{ color: 'var(--warning)' }} />
              <div className="stat-pill-value">{stats.foundingRemaining}</div>
              <div className="stat-pill-label">Founding left</div>
            </div>
          </div>

          <div className="fw-bold text-sm mb-8">Recent trainer signups</div>
          {stats.recentSignups.length === 0 ? (
            <p className="mp-scan-note">No trainer has signed up yet.</p>
          ) : (
            stats.recentSignups.map(s => (
              <div key={s.id} className="platform-signup-row">
                <span className="platform-signup-num">#{s.trainerNumber}</span>
                <span className="platform-signup-body">
                  <span className="platform-signup-name">{s.name}</span>
                  <span className="platform-signup-meta">
                    {s.email} · {String(s.createdAt).slice(0, 16).replace('T', ' ')}
                  </span>
                </span>
                {s.withinFounding && <span className="tag tag-accent">Founding</span>}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
