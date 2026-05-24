import { useState } from 'react';
import { Building2, Calendar, Users, ClipboardCheck, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { localToday } from '../utils/dateUtils';

export default function OperatorDashboard() {
  const { currentUser, getGymApplications, reviewGymApplication, getStudios, getAvailableSlots } = useApp();
  const addToast = useToast();
  const today = localToday();

  const applications = getGymApplications();
  const studios = getStudios();
  const allTodaySlots = getAvailableSlots({ date: today });

  const pendingApps = applications.filter(a => a.status === 'pending');
  const availableToday = allTodaySlots.filter(s => s.status === 'available').length;
  const bookedToday = allTodaySlots.filter(s => s.status === 'booked').length;

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedApp, setExpandedApp] = useState(null);

  const handleApprove = async (appId) => {
    setSaving(true);
    try {
      await reviewGymApplication(appId, 'approved', null);
      addToast('Application approved', 'success');
    } catch (err) {
      addToast('Failed to approve: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (appId) => {
    setSaving(true);
    try {
      await reviewGymApplication(appId, 'rejected', rejectNote);
      addToast('Application rejected', 'success');
      setRejectingId(null);
      setRejectNote('');
    } catch (err) {
      addToast('Failed to reject: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const studioTodaySlotCount = (studioId) =>
    allTodaySlots.filter(s => s.studioId === studioId).length;

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Operator Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>gym啦 platform management</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <Building2 size={28} style={{ color: 'var(--primary)', marginBottom: 8 }} />
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{studios.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Studios</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <Calendar size={28} style={{ color: 'var(--success)', marginBottom: 8 }} />
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{availableToday}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Available Slots Today</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <Calendar size={28} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{bookedToday}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Booked Today</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <Users size={28} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{pendingApps.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending Applications</div>
        </div>
      </div>

      {/* Pending applications */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="gymla-section-title">Pending Trainer Applications</h2>
        {pendingApps.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <ClipboardCheck size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No pending applications</p>
          </div>
        ) : (
          pendingApps.map(app => (
            <div key={app.id} className="application-card card">
              <div className="application-card-header">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{app.trainerName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{app.email}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    Applied: {app.appliedAt}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                  aria-label="Toggle details"
                >
                  {expandedApp === app.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {app.specialities && app.specialities.length > 0 && (
                <div className="application-specialities">
                  {app.specialities.map(s => (
                    <span key={s} className="tag tag-primary">{s}</span>
                  ))}
                </div>
              )}

              {expandedApp === app.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {app.bio && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bio</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{app.bio}</p>
                    </div>
                  )}
                  {app.certifications && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certifications</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{app.certifications}</p>
                    </div>
                  )}
                  {app.yearsExperience != null && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Experience</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{app.yearsExperience} years</p>
                    </div>
                  )}
                </div>
              )}

              <div className="application-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApprove(app.id)}
                  disabled={saving}
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setRejectingId(rejectingId === app.id ? null : app.id)}
                  disabled={saving}
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>

              {rejectingId === app.id && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    className="form-input reject-reason-input"
                    placeholder="Reason for rejection (optional)"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    rows={2}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(app.id)}
                      disabled={saving}
                    >
                      Confirm Reject
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setRejectingId(null); setRejectNote(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Studios overview */}
      <div>
        <h2 className="gymla-section-title">Active Studios</h2>
        {studios.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <Building2 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No studios yet. Go to <strong>Studios</strong> to add one.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {studios.filter(s => s.active !== false).map(studio => (
              <div key={studio.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 600 }}>{studio.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{studio.district}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {studioTodaySlotCount(studio.id)} slots today
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
