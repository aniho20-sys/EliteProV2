import { useState, useEffect } from 'react';
import { BarChart3, Star, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SkeletonLine } from './Skeleton';

// Ani's own operating numbers, shown on her Profile and nobody else's.
//
// The gate that matters is inside the getPlatformStats Cloud Function, which checks the
// caller's email server-side. This component simply does not render for anyone else — a
// client-side check alone would be decoration, since a page anyone can open cannot keep
// its own secrets.
export default function PlatformStatsCard() {
  const { getPlatformStats, getAccountAudit, previewTestAccountCleanup, deleteTestAccounts } = useApp();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [cleanup, setCleanup] = useState(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const runPreview = async () => {
    if (cleanupBusy) return;
    setCleanupBusy(true);
    setConfirming(false);
    try { setCleanup(await previewTestAccountCleanup()); }
    catch { setCleanup({ failed: true }); }
    finally { setCleanupBusy(false); }
  };

  const runDelete = async () => {
    if (cleanupBusy) return;
    setCleanupBusy(true);
    try {
      const res = await deleteTestAccounts(cleanup.count);
      setCleanup({ done: res.deleted, detached: res.detached });
      setConfirming(false);
      // The headline numbers are now wrong; pull them again rather than leave stale counts.
      getPlatformStats().then(setStats).catch(() => {});
      setAudit(null);
    } catch (err) {
      setCleanup({ failed: true, message: err?.message });
    } finally { setCleanupBusy(false); }
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

          <div className="platform-audit">
            <div className="fw-bold text-sm mb-8" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Clean up test accounts
            </div>
            <p className="mp-scan-note" style={{ marginTop: 0 }}>
              Removes accounts on <code>@example.com</code> only — a reserved domain no real
              person can own. Your own account and anything with a real address is never a
              candidate.
            </p>

            {cleanup?.done !== undefined ? (
              <p className="mp-scan-note">
                Deleted {cleanup.done} account{cleanup.done === 1 ? '' : 's'}
                {cleanup.detached ? `, detached ${cleanup.detached} real client${cleanup.detached === 1 ? '' : 's'}` : ''}.
              </p>
            ) : cleanup?.failed ? (
              <p className="mp-scan-note" style={{ color: 'var(--danger)' }}>
                {cleanup.message || 'Could not load the list. Try again.'}
              </p>
            ) : !cleanup ? (
              <button className="btn btn-outline btn-sm" onClick={runPreview} disabled={cleanupBusy} style={{ width: '100%' }}>
                {cleanupBusy ? 'Checking…' : 'Show what would be deleted'}
              </button>
            ) : (
              <>
                <p className="mp-scan-note">
                  <strong>{cleanup.count}</strong> account{cleanup.count === 1 ? '' : 's'} match
                  ({cleanup.trainers} trainers, {cleanup.clients} clients).
                  {cleanup.strandedClients.length > 0
                    ? ` ${cleanup.strandedClients.length} real client(s) attached to these will be detached, not deleted.`
                    : ' No real client is attached to any of them.'}
                </p>
                {cleanup.accounts.slice(0, 8).map(a => (
                  <div key={a.id} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{a.name || '(no name)'}</span>
                      <span className="platform-signup-meta">{a.email} · {a.role}</span>
                    </span>
                  </div>
                ))}
                {cleanup.count > 8 && (
                  <p className="mp-scan-note">…and {cleanup.count - 8} more, all on @example.com.</p>
                )}

                {!confirming ? (
                  <div className="mp-scan-actions">
                    <button className="btn btn-outline" onClick={() => setCleanup(null)} disabled={cleanupBusy}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => setConfirming(true)} disabled={cleanupBusy || cleanup.count === 0}>
                      Delete {cleanup.count}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mp-scan-note" style={{ color: 'var(--danger)', display: 'flex', gap: 6 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      This cannot be undone. It removes the sign-in, the profile and everything
                      attached to it.
                    </p>
                    <div className="mp-scan-actions">
                      <button className="btn btn-outline" onClick={() => setConfirming(false)} disabled={cleanupBusy}>Keep them</button>
                      <button className="btn btn-danger" onClick={runDelete} disabled={cleanupBusy}>
                        {cleanupBusy ? 'Deleting…' : `Yes, delete ${cleanup.count}`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
