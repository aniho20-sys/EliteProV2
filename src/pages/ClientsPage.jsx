import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Search, Copy, Check, Share2, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/EmptyState';

export default function ClientsPage() {
  const { currentUser, getClients, getBodyStats, getInviteCode } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const clients = getClients(currentUser.id);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inviteCode && currentUser?.id) {
      getInviteCode(currentUser.id).then(code => code && setInviteCode(code));
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
    const text = t('clients.share_text', { code: inviteCode });
    if (navigator.share) {
      try { await navigator.share({ title: t('profile.share_title'), text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      toast(t('clients.toast_msg_copied'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('nav.clients')}</h1>
        <p className="page-subtitle">{t('clients.active_count', { count: clients.length })}</p>
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
    </div>
  );
}
