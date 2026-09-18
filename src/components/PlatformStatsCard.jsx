import { useState, useEffect } from 'react';
import { BarChart3, Star, ChevronDown, Trash2, AlertTriangle, Search } from 'lucide-react';
import { useApp, isPermissionError } from '../context/AppContext';
import { SkeletonLine } from './Skeleton';
import { useLanguage } from '../i18n/LanguageContext';

// Ani's own operating numbers, shown on her Profile and nobody else's.
//
// The gate that matters is inside the getPlatformStats Cloud Function, which checks the
// caller's email server-side. This component simply does not render for anyone else — a
// client-side check alone would be decoration, since a page anyone can open cannot keep
// its own secrets.
export default function PlatformStatsCard() {
  const { t } = useLanguage();
  const { getPlatformStats, getAccountAudit, previewTestAccountCleanup, deleteTestAccounts, lookupAccountByEmail, setSignupExcluded } = useApp();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [cleanup, setCleanup] = useState(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookups, setLookups] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [excludingId, setExcludingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats()
      .then(data => { if (!cancelled) setStats(data); })
      .catch(err => {
        // permission-denied here means the signed-in account is not the owner, which is
        // the expected answer for everyone else — not something to shout about.
        if (!cancelled) setError(isPermissionError(err) ? 'hidden' : 'failed');
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
      setCleanup({ done: res.deleted, detached: res.detached, remaining: res.remaining || 0 });
      setConfirming(false);
      // The headline numbers are now wrong; pull them again rather than leave stale counts.
      getPlatformStats().then(setStats).catch(() => {});
      setAudit(null);
    } catch (err) {
      setCleanup({ failed: true, message: err?.message });
    } finally { setCleanupBusy(false); }
  };

  const toggleExcluded = async (signup) => {
    if (excludingId) return;
    setExcludingId(signup.id);
    try {
      await setSignupExcluded(signup.id, !signup.excluded);
      // Excluding one renumbers the queue behind it, so refetch rather than patch locally.
      setStats(await getPlatformStats());
    } catch {
      setError('failed');
    } finally { setExcludingId(null); }
  };

  const runLookup = async (e) => {
    e.preventDefault();
    const email = lookupEmail.trim();
    if (!email || lookingUp) return;
    setLookingUp(true);
    try {
      const res = await lookupAccountByEmail(email);
      // Kept as a list so two accounts can be compared side by side without re-typing.
      setLookups(prev => [res, ...prev.filter(r => r.email !== res.email)]);
      setLookupEmail('');
    } catch (err) {
      setLookups(prev => [{ email, failed: err?.message || 'Lookup failed' }, ...prev]);
    } finally { setLookingUp(false); }
  };

  if (error === 'hidden') return null;

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={18} /> {t('pstats.title')}
      </h3>
      <p className="invite-desc">{t('pstats.subtitle')}</p>

      {error === 'failed' ? (
        <p className="mp-scan-note">{t('pstats.load_failed')}</p>
      ) : !stats ? (
        <div className="mt-8"><SkeletonLine /><SkeletonLine width="70%" /></div>
      ) : (
        <>
          <div className="stat-strip mt-8 mb-16">
            <div className="stat-pill">
              <div className="stat-pill-value">{stats.signupCount}</div>
              <div className="stat-pill-label">{t('pstats.signups')}</div>
            </div>
            <div className="stat-pill">
              <Star size={15} style={{ color: 'var(--warning)' }} />
              <div className="stat-pill-value">{stats.foundingRemaining}</div>
              <div className="stat-pill-label">{t('pstats.founding_left')}</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{stats.clientCount}</div>
              <div className="stat-pill-label">{t('pstats.clients')}</div>
            </div>
          </div>

          {/* Two different numbers, and conflating them is what made the founding places
              read as gone before anyone had signed up. Signups counts trainers who arrived
              after the offer went live; the total also counts every development and QA
              account ever created. */}
          <p className="mp-scan-note" style={{ marginTop: 0, marginBottom: 16 }}>
            {t('pstats.total_note', { count: stats.trainerCount })}
            {stats.excludedCount > 0 && ` ${t('pstats.excluded_note', { count: stats.excludedCount })}`}
          </p>

          <div className="fw-bold text-sm mb-8">{t('pstats.recent_signups')}</div>
          {stats.recentSignups.length === 0 ? (
            <p className="mp-scan-note">{t('pstats.no_signups')}</p>
          ) : (
            stats.recentSignups.map(s => (
              <div key={s.id} className="platform-signup-row" style={s.excluded ? { opacity: 0.55 } : undefined}>
                <span className="platform-signup-num">{s.excluded ? '—' : `#${s.signupNumber}`}</span>
                <span className="platform-signup-body">
                  <span className="platform-signup-name">{s.name}</span>
                  <span className="platform-signup-meta">
                    {s.email} · {String(s.createdAt).slice(0, 16).replace('T', ' ')}
                  </span>
                  {/* The event is never deleted, so this has to be reversible and has to
                      say which way it currently sits. */}
                  <button
                    className="platform-signup-toggle"
                    onClick={() => toggleExcluded(s)}
                    disabled={excludingId === s.id}
                  >
                    {excludingId === s.id
                      ? t('common.saving')
                      : s.excluded ? t('pstats.count_it') : t('pstats.not_real')}
                  </button>
                </span>
                {s.excluded
                  ? <span className="tag">{t('pstats.not_counted')}</span>
                  : s.withinFounding && <span className="tag tag-accent">{t('pstats.founding')}</span>}
              </div>
            ))
          )}

          <div className="platform-audit">
            {!audit ? (
              <button className="btn btn-outline btn-sm" onClick={runAudit} disabled={auditing} style={{ width: '100%' }}>
                <ChevronDown size={14} /> {auditing ? t('pstats.checking') : t('pstats.audit_cta')}
              </button>
            ) : audit.failed ? (
              <p className="mp-scan-note">{t('pstats.audit_failed')}</p>
            ) : (
              <>
                <p className="mp-scan-note" style={{ marginTop: 0 }}>
                  {t('pstats.audit_intro', {
                    dormant: audit.totals.dormantTrainers,
                    trainers: audit.totals.trainers,
                    unattached: audit.totals.unattachedClients,
                  })}
                </p>
                <p className="mp-scan-note">
                  {t('pstats.audit_returned', { count: audit.totals.returnedEver })}
                </p>

                <div className="fw-bold text-sm mb-8">{t('pstats.by_day')}</div>
                {audit.signupsByDate.slice(0, 12).map(d => (
                  <div key={d.date} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{d.date}</span>
                      <span className="platform-signup-meta">
                        {t('pstats.n_trainers', { count: d.trainers })} · {t('pstats.n_clients', { count: d.clients })}
                      </span>
                    </span>
                  </div>
                ))}

                <div className="fw-bold text-sm mb-8 mt-16">{t('pstats.trainer_accounts')}</div>
                {audit.trainers.map(tr => (
                  <div key={tr.id} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{tr.name}</span>
                      <span className="platform-signup-meta">
                        {tr.email} · {tr.provider.replace('.com', '')} · {t('pstats.joined', { date: tr.joinDate })}
                        {tr.lastSignIn ? ` · ${t('pstats.last_seen', { date: tr.lastSignIn.replace('T', ' ') })}` : ''}
                      </span>
                      <span className="platform-signup-meta">
                        {t('pstats.trainer_counts', { clients: tr.clients, plans: tr.plans, sessions: tr.sessions })}
                      </span>
                    </span>
                    {tr.returned
                      ? <span className="tag tag-accent">{t('pstats.came_back')}</span>
                      : tr.dormant && <span className="tag">{t('pstats.unused')}</span>}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="platform-audit">
            <div className="fw-bold text-sm mb-8" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> {t('pstats.lookup')}
            </div>
            <p className="mp-scan-note" style={{ marginTop: 0 }}>
              {t('pstats.lookup_desc')}
            </p>
            <form onSubmit={runLookup} className="lookup-row">
              <input
                className="form-input"
                type="email"
                placeholder={t('pstats.ph_email')}
                value={lookupEmail}
                onChange={ev => setLookupEmail(ev.target.value)}
              />
              <button className="btn btn-outline" type="submit" disabled={lookingUp || !lookupEmail.trim()}>
                {lookingUp ? '…' : t('pstats.check')}
              </button>
            </form>
            {lookups.map(r => (
              <div key={r.email} className="platform-signup-row">
                <span className="platform-signup-body">
                  <span className="platform-signup-name">{r.email}</span>
                  {r.failed ? (
                    <span className="platform-signup-meta" style={{ color: 'var(--danger)' }}>{r.failed}</span>
                  ) : !r.exists ? (
                    <span className="platform-signup-meta" style={{ color: 'var(--danger)' }}>
                      {t('pstats.no_account')}
                    </span>
                  ) : (
                    <>
                      <span className="platform-signup-meta">
                        {r.providers.join(' + ')} · {r.role || t('pstats.no_profile')}
                        {r.disabled ? ` · ${t('pstats.disabled')}` : ''}
                      </span>
                      <span className="platform-signup-meta">
                        {t('pstats.created', { date: String(r.createdAt || '').slice(0, 16) })} · {t('pstats.last_seen', { date: String(r.lastSignIn || '').slice(0, 16) })}
                      </span>
                    </>
                  )}
                </span>
                {r.exists && (
                  <span className={`tag ${r.canResetPassword ? 'tag-accent' : 'tag-danger'}`}>
                    {r.canResetPassword ? t('pstats.can_reset') : t('pstats.no_password')}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="platform-audit">
            <div className="fw-bold text-sm mb-8" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> {t('pstats.cleanup')}
            </div>
            <p className="mp-scan-note" style={{ marginTop: 0 }}>
              {t('pstats.cleanup_desc')}
            </p>

            {cleanup?.done !== undefined ? (
              <>
                <p className="mp-scan-note">
                  {t('pstats.deleted_n', { count: cleanup.done })}
                  {cleanup.detached > 0 && ` ${t('pstats.detached_n', { count: cleanup.detached })}`}
                </p>
                {/* A run is capped, so "deleted 40" on its own would read as "finished". */}
                {cleanup.remaining > 0 && (
                  <>
                    <p className="mp-scan-note">
                      {t('pstats.remaining_n', { count: cleanup.remaining })}
                    </p>
                    <button className="btn btn-outline btn-sm" onClick={runPreview} disabled={cleanupBusy} style={{ width: '100%' }}>
                      {cleanupBusy ? t('pstats.checking') : t('pstats.show_rest')}
                    </button>
                  </>
                )}
              </>
            ) : cleanup?.failed ? (
              <p className="mp-scan-note" style={{ color: 'var(--danger)' }}>
                {cleanup.message || t('pstats.list_failed')}
              </p>
            ) : !cleanup ? (
              <button className="btn btn-outline btn-sm" onClick={runPreview} disabled={cleanupBusy} style={{ width: '100%' }}>
                {cleanupBusy ? t('pstats.checking') : t('pstats.show_preview')}
              </button>
            ) : (
              <>
                <p className="mp-scan-note">
                  {t('pstats.match_n', {
                    count: cleanup.count,
                    trainers: cleanup.trainers,
                    clients: cleanup.clients,
                  })}
                  {cleanup.noProfile > 0 && ` ${t('pstats.match_signin_only', { count: cleanup.noProfile })}`}
                  {' '}
                  {cleanup.strandedClients.length > 0
                    ? t('pstats.stranded_n', { count: cleanup.strandedClients.length })
                    : t('pstats.no_stranded')}
                </p>
                {cleanup.accounts.slice(0, 8).map(a => (
                  <div key={a.id} className="platform-signup-row">
                    <span className="platform-signup-body">
                      <span className="platform-signup-name">{a.name || t('pstats.no_name')}</span>
                      <span className="platform-signup-meta">{a.email} · {a.role || t('pstats.signin_only')}</span>
                    </span>
                  </div>
                ))}
                {cleanup.count > 8 && (
                  <p className="mp-scan-note">{t('pstats.and_more', { count: cleanup.count - 8 })}</p>
                )}

                {!confirming ? (
                  <div className="mp-scan-actions">
                    <button className="btn btn-outline" onClick={() => setCleanup(null)} disabled={cleanupBusy}>{t('common.cancel')}</button>
                    <button className="btn btn-danger" onClick={() => setConfirming(true)} disabled={cleanupBusy || cleanup.count === 0}>
                      {t('pstats.delete_n', { count: cleanup.count })}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mp-scan-note" style={{ color: 'var(--danger)', display: 'flex', gap: 6 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      {t('pstats.delete_warning')}
                    </p>
                    <div className="mp-scan-actions">
                      <button className="btn btn-outline" onClick={() => setConfirming(false)} disabled={cleanupBusy}>{t('pstats.keep_them')}</button>
                      <button className="btn btn-danger" onClick={runDelete} disabled={cleanupBusy}>
                        {cleanupBusy ? t('pstats.deleting') : t('pstats.yes_delete_n', { count: cleanup.count })}
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
