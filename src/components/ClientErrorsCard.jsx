import { useState, useEffect } from 'react';
import { Bug, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDateTime } from '../i18n/format';
import EmptyState from './EmptyState';
import { SkeletonLine } from './Skeleton';

// Ani's view of the app's error reports (functions/clientErrors.js). Rendered only on her
// Profile; the real gate is firestore.rules, which lets no one else read clientErrors.
//
// The copy button exists because Ani works from her phone (#26): the way a report reaches
// whoever fixes it is pasting it into a chat, so it copies everything needed in one go.
export default function ClientErrorsCard() {
  const { t, lang } = useLanguage();
  const { getClientErrors } = useApp();
  const toast = useToast();
  const [errors, setErrors] = useState(null);
  const [failed, setFailed] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getClientErrors()
      .then(list => { if (!cancelled) setErrors(list); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [getClientErrors]);

  const copy = async (e) => {
    const text = [
      `App error: ${e.message}`,
      `Seen ${e.count} time(s), ${(e.users || []).length} account(s), ${e.firstSeen} → ${e.lastSeen}`,
      `Where: ${e.source} · ${e.url}`,
      `Device: ${e.userAgent}`,
      `Build: ${e.build}`,
      `Id: clientErrors/${e.id}`,
      '',
      e.stack,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(e.id);
      setTimeout(() => setCopiedId(id => (id === e.id ? null : id)), 2000);
    } catch {
      toast(t('common.copy_failed'), 'error');
    }
  };

  return (
    <div className="card mb-16">
      <h3 className="card-title mb-8" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bug size={18} /> {t('errors.title')}
      </h3>
      <p className="invite-desc">{t('errors.desc')}</p>

      {failed ? (
        <p className="text-sm text-muted mt-8">{t('errors.load_failed')}</p>
      ) : errors === null ? (
        <div className="mt-8"><SkeletonLine /><SkeletonLine width="70%" /></div>
      ) : errors.length === 0 ? (
        <EmptyState compact icon={Bug} title={t('errors.empty_title')} description={t('errors.empty_desc')} />
      ) : (
        <ul className="client-errors-list">
          {errors.map(e => (
            <li key={e.id} className="client-errors-item">
              <strong className="client-errors-message">{e.message}</strong>
              <span className="text-sm text-muted">
                {t('errors.seen', { count: e.count, when: formatDateTime(e.lastSeen, lang) })}
                {' · '}
                {t('errors.affected', { people: (e.users || []).length })}
              </span>
              <span className="text-sm text-muted client-errors-url">{e.url}</span>
              <details className="text-sm">
                <summary>{t('errors.details')}</summary>
                <pre className="client-errors-stack">{e.stack}</pre>
              </details>
              <button className="btn btn-outline btn-sm" onClick={() => copy(e)}>
                {copiedId === e.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === e.id ? t('profile.copied') : t('errors.copy')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
