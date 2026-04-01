import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ClientsPage() {
  const { currentUser, getClients, addClient, getBodyStats } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const clients = getClients(currentUser.id);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', height: '', goals: '', notes: '' });

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = (e) => {
    e.preventDefault();
    addClient({ ...form, trainerId: currentUser.id, age: Number(form.age), height: Number(form.height) });
    setForm({ name: '', email: '', password: '', age: '', height: '', goals: '', notes: '' });
    setShowAdd(false);
    toast('Client added successfully');
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Clients</h1>
            <p className="page-subtitle">{clients.length} active clients</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={18} /> Add Client
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid-3">
        {filtered.map(client => {
          const stats = getBodyStats(client.id);
          const latest = stats[stats.length - 1];
          return (
            <div key={client.id} className="card client-card" onClick={() => navigate(`/clients/${client.id}`)}>
              <div className="client-name">{client.name}</div>
              <div className="client-meta">Age: {client.age} | {client.height}cm | Joined: {client.joinDate}</div>
              {latest && <div className="client-meta mt-8">Weight: {latest.weight}kg | BF: {latest.bodyFat}%</div>}
              <div className="client-goals">{client.goals}</div>
              {client.notes && <div className="text-sm text-muted mt-8" style={{ fontStyle: 'italic' }}>{client.notes}</div>}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add New Client</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input className="form-input" type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Goals</label>
                <textarea className="form-textarea" value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
