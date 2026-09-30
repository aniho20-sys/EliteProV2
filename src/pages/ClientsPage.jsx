import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Search, Copy, Check, Share2, UserPlus, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';
import { inviteUrl } from '../utils/inviteLink';
import { hasAppAccount, MANAGED_NAME_MAX } from '../utils/managedClient';

export default function ClientsPage() {
  const { currentUser, getClients, getBodyStats, getInviteCode, addManagedClient } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const clients = getClients(currentUser.id);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');
  const [copied, setCopied] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // B35: a coach can start with a client who has not signed up (or never will) instead
  // of waiting for them to download the app — the first thing a new coach wants to try.
  const closeAdd = () => { if (!adding) { setShowAdd(false); setNewName(''); } };
  const handleAdd = async (e) => {
    e.preventDefault();
    if (adding || !newName.trim()) return;
    setAdding(true);
    try {
      const client = await addManagedClient(newName);
      toast(t('clients.toast_added', { name: client.name }));
      setShowAdd(false);
      setNewName('');
      navigate(`/clients/${client.id}`);
    } catch {
      toast(t('clients.toast_add_failed'), 'error');
    } finally {
      setAdding(false);
    }
  };

  // Asked once per mount: getInviteCode is recreated on every AppContext render, and it is
  // now a server call, so an effect keyed on it would call ensureInviteCode on every render
  // while the code is still empty — and forever if that call fails.
  const inviteRequested = useRef(false);
  useEffect(() => {
    if (!inviteCode && currentUser?.id && !inviteRequested.current) {
      inviteRequested.current = true;
      getInviteCode(currentUser.id)
        .then(code => code && setInviteCode(code))
        .catch(err => console.error('[ClientsPage] invite code not issued', err));
    }
  }, [currentUser, inviteCode, getInviteCode]);

  const allTags = ['All', ...Array.from(new Set(clients.flatMap(c => c.tags || []))).sort()];

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = activeTag === 'All' || (c.tags || []).includes(activeTag);
    return matchSearch && matchTag;
  });

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast(t('clients.toast_code_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    // The link opens sign-up with the code already filled in; the text alone left the
    // client to find the app by themselves.
    const url = inviteUrl(inviteCode);
    const text = t('clients.share_text', { code: inviteCode });
    if (navigator.share) {
      try { await navigator.share({ title: t('profile.share_title'), text, url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast(t('clients.toast_msg_copied'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.clients')}</h1>
          <p className="page-subtitle">{t('clients.active_count', { count: clients.length })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {t('clients.add_client')}
        </button>
      </div>

      {/* Invite Code Card */}
      <div className="card invite-code-card">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="text-sm text-muted">{t('clients.your_invite_code')}</div>
            <div className="invite-code-text">{inviteCode || '------'}</div>
            <div className="text-sm text-muted mt-8">
              {t('clients.invite_help')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={handleCopy} disabled={!inviteCode}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('common.copied') : t('common.copy')}
            </button>
            <button className="btn btn-primary" onClick={handleShare} disabled={!inviteCode}>
              <Share2 size={16} /> {t('clients.share')}
            </button>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder={t('clients.search_ph')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {allTags.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`btn btn-sm ${activeTag === tag ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag === 'All' ? t('clients.tag_all') : tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={search || activeTag !== 'All' ? t('clients.no_matching') : t('tdash.no_clients_yet')}
          description={
            search || activeTag !== 'All'
              ? t('clients.no_match_desc')
              : t('clients.no_clients_desc')
          }
          action={!search && activeTag === 'All' && inviteCode ? { label: t('clients.copy_invite_code'), onClick: handleCopy } : undefined}
        />
      ) : (
        <div className="grid-3">
          {filtered.map(client => {
            const stats = getBodyStats(client.id);
            const latest = stats[stats.length - 1];
            return (
              <div key={client.id} className="card client-card" onClick={() => navigate(`/clients/${client.id}`)}>
                <div className="client-name">{client.name}</div>
                {!hasAppAccount(client) && <span className="tag tag-primary mt-8">{t('clients.no_app')}</span>}
                <div className="client-meta">{t('clients.meta_line', { age: client.age || '—', height: client.height || '—', date: client.joinDate })}</div>
                {latest && <div className="client-meta mt-8">{t('clients.meta_stats', { weight: latest.weight, bf: latest.bodyFat })}</div>}
                <div className="client-goals">{client.goals}</div>
                {client.notes && <div className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{client.notes}</div>}
                {(client.tags || []).length > 0 && (
                  <div className="client-tags-row mt-8">
                    {client.tags.map(tag => (
                      <span key={tag} className="client-tag client-tag-readonly">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('clients.add_title')}</h3>
            <p className="text-sm text-secondary mb-16">{t('clients.add_desc')}</p>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label" htmlFor="add-client-name">{t('clients.add_name_label')}</label>
                <input
                  id="add-client-name" className="form-input" autoFocus required
                  maxLength={MANAGED_NAME_MAX} value={newName}
                  placeholder={t('clients.add_name_ph')}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeAdd} disabled={adding}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
                  {adding ? t('common.saving') : t('clients.add_client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
