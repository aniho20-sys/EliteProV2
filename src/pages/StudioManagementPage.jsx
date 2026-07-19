import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Building2, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { localToday } from '../utils/dateUtils';

const FACILITIES = ['Shower', 'Parking', 'Mirrors', 'AC', 'Locker', 'WiFi', 'Weights', 'Cardio Equipment'];

export default function StudioManagementPage() {
  const { getStudios, addStudio, updateStudio, getAvailableSlots, openStudioSlots, cancelSlotBooking } = useApp();
  const toast = useToast();
  const today = localToday();
  const studios = getStudios();
  const allSlots = getAvailableSlots({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedStudio, setExpandedStudio] = useState(null);
  const [savingStudio, setSavingStudio] = useState(false);
  const [openingSlots, setOpeningSlots] = useState(null);

  const [studioForm, setStudioForm] = useState({
    name: '', address: '', district: '', facilities: [],
    photoUrl: '', pricePerHour: '', description: '',
  });
  const [slotForm, setSlotForm] = useState({ date: today, startHour: 9, endHour: 21, priceHKD: '' });

  const toggleFacility = (fac) => {
    setStudioForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(fac)
        ? prev.facilities.filter(f => f !== fac)
        : [...prev.facilities, fac],
    }));
  };

  const handleAddStudio = async (e) => {
    e.preventDefault();
    if (!studioForm.name.trim()) { toast('Studio name required', 'error'); return; }
    setSavingStudio(true);
    try {
      await addStudio({
        name: studioForm.name.trim(),
        address: studioForm.address.trim(),
        district: studioForm.district.trim(),
        facilities: studioForm.facilities,
        photoUrl: studioForm.photoUrl.trim() || null,
        pricePerHour: Number(studioForm.pricePerHour) || 0,
        description: studioForm.description.trim() || null,
      });
      toast('Studio added');
      setShowAddForm(false);
      setStudioForm({ name: '', address: '', district: '', facilities: [], photoUrl: '', pricePerHour: '', description: '' });
    } catch {
      toast('Failed to add studio', 'error');
    } finally {
      setSavingStudio(false);
    }
  };

  const handleOpenSlots = async (studio) => {
    if (openingSlots === studio.id) return;
    if (slotForm.startHour >= slotForm.endHour) { toast('End hour must be after start hour', 'error'); return; }
    setOpeningSlots(studio.id);
    try {
      const { added, skipped } = await openStudioSlots(
        studio.id, studio.name,
        slotForm.date,
        Number(slotForm.startHour),
        Number(slotForm.endHour),
        Number(slotForm.priceHKD) || studio.pricePerHour || 0,
      );
      if (added > 0) toast(`Added ${added} slot${added !== 1 ? 's' : ''}${skipped ? ` (${skipped} skipped — already exist)` : ''}`);
      else toast(`All slots already exist for this date`, 'info');
    } catch {
      toast('Failed to open slots', 'error');
    } finally {
      setOpeningSlots(null);
    }
  };

  const handleCancelSlot = async (slotId) => {
    try {
      await cancelSlotBooking(slotId);
      toast('Slot cancelled');
    } catch {
      toast('Failed to cancel slot', 'error');
    }
  };

  const handleToggleActive = async (studio) => {
    try {
      await updateStudio(studio.id, { active: !studio.active });
      toast(studio.active ? 'Studio deactivated' : 'Studio activated');
    } catch {
      toast('Failed to update studio', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Studio Management</h1>
        <p className="page-subtitle">Manage venues and time slots</p>
      </div>

      <div className="flex-between mb-16">
        <span className="text-muted text-sm">{studios.length} studio{studios.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
          <Plus size={16} /> Add Studio
        </button>
      </div>

      {showAddForm && (
        <div className="card mb-16">
          <div className="card-header">
            <h3 className="card-title">New Studio</h3>
            <button className="btn-icon" onClick={() => setShowAddForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleAddStudio}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Studio Name *</label>
                <input className="form-input" required value={studioForm.name} onChange={e => setStudioForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Flex Studio 旺角" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">District</label>
                <input className="form-input" value={studioForm.district} onChange={e => setStudioForm(p => ({ ...p, district: e.target.value }))} placeholder="旺角" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={studioForm.address} onChange={e => setStudioForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" />
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Price/Hour (HKD)</label>
                <input className="form-input" type="number" min="0" value={studioForm.pricePerHour} onChange={e => setStudioForm(p => ({ ...p, pricePerHour: e.target.value }))} placeholder="200" />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Photo URL (optional)</label>
                <input className="form-input" type="url" value={studioForm.photoUrl} onChange={e => setStudioForm(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Facilities</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FACILITIES.map(fac => (
                  <button key={fac} type="button"
                    className={`tag ${studioForm.facilities.includes(fac) ? 'tag-accent' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleFacility(fac)}
                  >{fac}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={2} value={studioForm.description} onChange={e => setStudioForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingStudio}>{savingStudio ? 'Adding…' : 'Add Studio'}</button>
            </div>
          </form>
        </div>
      )}

      {studios.length === 0 ? (
        <EmptyState icon={Building2} title="No studios yet" description="Add your first studio to start managing time slots." action={{ label: 'Add Studio', onClick: () => setShowAddForm(true) }} />
      ) : (
        studios.map(studio => {
          const studioAllSlots = allSlots.filter(s => s.studioId === studio.id);
          const todaySlots = studioAllSlots.filter(s => s.date === today);
          const isExpanded = expandedStudio === studio.id;

          return (
            <div key={studio.id} className="card mb-16">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{studio.name}</h3>
                  <div className="text-sm text-muted">{studio.district} · HKD {studio.pricePerHour}/hr</div>
                </div>
                <div className="flex gap-8" style={{ alignItems: 'center' }}>
                  <span className={`tag ${studio.active !== false ? 'tag-accent' : ''}`}>{studio.active !== false ? 'Active' : 'Inactive'}</span>
                  <button className="btn btn-sm btn-outline" onClick={() => handleToggleActive(studio)}>
                    {studio.active !== false ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => setExpandedStudio(isExpanded ? null : studio.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Manage Slots
                  </button>
                </div>
              </div>

              {studio.address && <p className="text-sm text-muted">{studio.address}</p>}
              {studio.facilities?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {studio.facilities.map(f => <span key={f} className="tag">{f}</span>)}
                </div>
              )}

              {isExpanded && (
                <div className="studio-slots-section">
                  <h4 className="gymla-section-title">Open Time Slots</h4>
                  <div className="form-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                    <div className="form-group" style={{ flex: '1 1 140px' }}>
                      <label className="form-label">Date</label>
                      <input className="form-input" type="date" value={slotForm.date} min={today} onChange={e => setSlotForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 100px' }}>
                      <label className="form-label">From (hr)</label>
                      <input className="form-input" type="number" min={0} max={23} value={slotForm.startHour} onChange={e => setSlotForm(p => ({ ...p, startHour: Number(e.target.value) }))} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 100px' }}>
                      <label className="form-label">To (hr)</label>
                      <input className="form-input" type="number" min={1} max={24} value={slotForm.endHour} onChange={e => setSlotForm(p => ({ ...p, endHour: Number(e.target.value) }))} />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 120px' }}>
                      <label className="form-label">Price HKD/hr</label>
                      <input className="form-input" type="number" min={0} value={slotForm.priceHKD} placeholder={studio.pricePerHour || '0'} onChange={e => setSlotForm(p => ({ ...p, priceHKD: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenSlots(studio)} disabled={openingSlots === studio.id} style={{ marginBottom: '1rem' }}>
                      {openingSlots === studio.id ? 'Opening…' : 'Open Slots'}
                    </button>
                  </div>

                  {todaySlots.length > 0 && (
                    <>
                      <h4 className="gymla-section-title" style={{ marginTop: 16 }}>Today&apos;s Slots</h4>
                      <div className="slots-grid">
                        {todaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                          <div key={slot.id} className={`slot-chip ${slot.status}`}>
                            <div>{slot.startTime}–{slot.endTime}</div>
                            <div style={{ fontSize: '0.75rem' }}>{slot.status === 'booked' ? 'Booked' : 'Free'}</div>
                            {slot.status === 'booked' && (
                              <button className="btn btn-sm btn-outline" style={{ fontSize: '0.7rem', padding: '2px 6px', marginTop: 4 }} onClick={() => handleCancelSlot(slot.id)}>
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
