import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Search, Copy, Check, Share2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ClientsPage() {
  const { currentUser, getClients, getBodyStats, getInviteCode } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const clients = getClients(currentUser.id);
  const [search, setSearch] = useState('');
  const [inviteCode, setInviteCode] = useState(currentUser.inviteCode || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inviteCode && currentUser?.id) {
      getInviteCode(currentUser.id).then(code => code && setInviteCode(code));
    }
  }, [currentUser, inviteCode, getInviteCode]);

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast('Invite code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    const text = `Join me on ElitePro! Use invite code: ${inviteCode}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'ElitePro Invite', text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      toast('Invite message copied');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
        <p className="page-subtitle">{clients.length} active {clients.length === 1 ? 'client' : 'clients'}</p>
      </div>

      {/* Invite Code Card */}
      <div className="card invite-code-card">
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="text-sm text-muted">Your Invite Code</div>
            <div className="invite-code-text">{inviteCode || '------'}</div>
            <div className="text-sm text-muted mt-8">
              Share this code with clients so they can sign up and connect to you.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={handleCopy} disabled={!inviteCode}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn btn-primary" onClick={handleShare} disabled={!inviteCode}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-muted">No clients yet.</div>
          <div className="text-sm text-muted mt-8">Share your invite code above to get your first client onboard.</div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(client => {
            const stats = getBodyStats(client.id);
            const latest = stats[stats.length - 1];
            return (
              <div key={client.id} className="card client-card" onClick={() => navigate(`/clients/${client.id}`)}>
                <div className="client-name">{client.name}</div>
                <div className="client-meta">Age: {client.age || '—'} | {client.height || '—'}cm | Joined: {client.joinDate}</div>
                {latest && <div className="client-meta mt-8">Weight: {latest.weight}kg | BF: {latest.bodyFat}%</div>}
                <div className="client-goals">{client.goals}</div>
                {client.notes && <div className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{client.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
