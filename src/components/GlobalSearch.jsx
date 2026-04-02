import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, X } from 'lucide-react';

export default function GlobalSearch({ onSelect }) {
  const { currentUser, getClients, getExercises, getWorkoutPlans } = useApp();
  const navigate = useNavigate();
  const isTrainer = currentUser?.role === 'trainer';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const exercises = getExercises();
  const clients = isTrainer ? getClients(currentUser.id) : [];
  const plans = getWorkoutPlans(isTrainer ? { trainerId: currentUser.id } : { clientId: currentUser.id });

  const q = query.toLowerCase().trim();

  const results = q ? [
    ...clients
      .filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'Client', label: c.name, sub: c.email, action: () => navigate(`/clients/${c.id}`) })),
    ...exercises
      .filter(e => e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
      .slice(0, 4)
      .map(e => ({ type: 'Exercise', label: e.name, sub: `${e.muscle} / ${e.equipment}`, action: () => navigate('/exercises') })),
    ...plans
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ type: 'Plan', label: p.name, sub: p.day, action: () => navigate('/plans') })),
  ] : [];

  const handleSelect = (result) => {
    result.action();
    setQuery('');
    setOpen(false);
    onSelect?.();
  };

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Sidebar search */}
      <div className="global-search-bar">
        <Search size={15} className="global-search-icon" />
        <input
          ref={inputRef}
          className="global-search-input"
          placeholder="Search..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && <button className="global-search-clear" onClick={() => { setQuery(''); setOpen(false); }}><X size={14} /></button>}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="global-search-results">
          {results.map((r, i) => (
            <div key={i} className="global-search-item" onClick={() => handleSelect(r)}>
              <span className="global-search-type">{r.type}</span>
              <div className="global-search-info">
                <span className="global-search-label">{r.label}</span>
                <span className="global-search-sub">{r.sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && q && results.length === 0 && (
        <div className="global-search-results">
          <div className="global-search-empty">No results for &quot;{query}&quot;</div>
        </div>
      )}

      {/* Click outside to close */}
      {open && <div className="global-search-backdrop" onClick={() => { setOpen(false); setQuery(''); }} />}
    </>
  );
}
