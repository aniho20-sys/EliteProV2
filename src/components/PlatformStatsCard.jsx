import { useState, useEffect } from 'react';
import { BarChart3, Star, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SkeletonLine } from './Skeleton';

// Ani's own operating numbers, shown on her Profile and nobody else's.
//
// The gate that matters is inside the getPlatformStats Cloud Function, which checks the
// caller's email server-side. This component simply does not render for anyone else — a
// client-side check alone would be decoration, since a page anyone can open cannot keep
// its own secrets.
export default function PlatformStatsCard() {
  const { getPlatformStats, getAccountAudit } = useApp();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditing, setAuditing] = useState(false);

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

  const runAudit = async () => {
    if (auditing) return;
    setAuditing(true);
    try { setAudit(await getAccountAudit()); }
    catch { setAudit({ failed: true }); }
    finally { setAuditing(false); }
  };

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
              <div className="stat-pill-value">{stats.signupCount}</div>
              <div className="stat-pill-label">Signups</div>
            </div>
            <div className="stat-pill">
              <Star size={15} style={{ color: 'var(--warning)' }} />
              <div className="stat-pill-value">{stats.foundingRemaining}</div>
              <div className="stat-pill-label">Founding left</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{stats.clientCount}</div>
              <div className="stat-pill-label">Clients</div>
            </div>
          </div>

          {/* Two different numbers, and conflating them is what made the founding places
              read as gone before anyone had signed up. Signups counts trainers who arrived
              after the offer went live; the total also counts every development and QA
              account ever created. */}
          <p className="mp-scan-note" style={{ marginTop: 0, marginBottom: 16 }}>
            {stats.trainerCount} trainer account{stats.trainerCount === 1 ? '' : 's'} exist in total,
            including old test accounts. Founding places count signups only.
          </p>

          <div className="fw-bold text-sm mb-8">Recent trainer signups</div>
          {stats.recentSignups.length === 0 ? (
            <p className="mp-scan-note">No trainer has signed up yet.</p>
          ) : (
            stats.recentSignups.map(s => (
              <div key={s.id} className="platform-signup-row">
                <span className="platform-signup-num">#{s.signupNumber}</span>
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

          <div className="platform-audit">
            {!audit ? (
              <button className="btn btn-outline btn-sm" onClick={runAudit} disabled={auditing} style={{ width: '100%' }}>
                <ChevronDown size={14} /> {auditing ? 'Checking…' : 'Where did these accounts come from?'}
              </button>
            ) : audit.failed ? (
              <p className="mp-scan-note">Could not load the audit. Try again.</p>
            ) : (
              <>
                <p className="mp-scan-note" style={{ marginTop: 0 }}>
                  Every account came from someone signing in and picking a role — nothing is
                  seeded. <strong>{audit.totals.dormantTrainers} of {audit.totals.trainers}</strong> trainer
                  accounts never gained a client, a plan or a session, and{' '}
                  <strong>{audit.totals.unattachedClients}</strong> client
                  {audit.totals.unattachedClients === 1 ? ' is' : 's are'} not connected to any trainer.
                </p>
                <p className="mp-scan-note">
                  <strong>{audit.totals.returnedEver}</strong> account
                  {audit.totals.returnedEver === 1 ? '' : 's'} signed in again on a later day.
                  That is the number that means somebody meant it — a test account never comes back.
                </p>

                <div className="fw-bold text-sm mb-8">Signups by day</div>
                {audit.signupsByDate.slice(0, 12).map(d => (
                  <div key={d.date} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{d.date}</span>
                      <span className="platform-signup-meta">
                        {d.trainers} trainer{d.trainers === 1 ? '' : 's'} · {d.clients} client{d.clients === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>
                ))}

                <div className="fw-bold text-sm mb-8 mt-16">Trainer accounts</div>
                {audit.trainers.map(t => (
                  <div key={t.id} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{t.name}</span>
                      <span className="platform-signup-meta">
                        {t.email} · {t.provider.replace('.com', '')} · joined {t.joinDate}
                        {t.lastSignIn ? ` · last seen ${t.lastSignIn.replace('T', ' ')}` : ''}
                      </span>
                      <span className="platform-signup-meta">
                        {t.clients} clients, {t.plans} plans, {t.sessions} sessions
                      </span>
                    </span>
                    {t.returned
                      ? <span className="tag tag-accent">Came back</span>
                      : t.dormant && <span className="tag">Unused</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
