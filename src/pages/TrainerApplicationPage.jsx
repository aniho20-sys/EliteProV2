import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileBadge, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function TrainerApplicationPage() {
  const { currentUser, getMyGymApplication, submitGymApplication } = useApp();
  const addToast = useToast();
  const navigate = useNavigate();

  const existing = getMyGymApplication();
  const [forceForm, setForceForm] = useState(false);

  const [form, setForm] = useState({
    photoUrl: currentUser?.avatar || '',
    bio: '',
    specialities: '',
    certifications: '',
    yearsExperience: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bio.trim()) {
      addToast('Please enter a bio', 'error');
      return;
    }
    setSaving(true);
    try {
      const specialitiesArray = form.specialities
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await submitGymApplication({
        photoUrl: form.photoUrl.trim() || null,
        bio: form.bio.trim(),
        specialities: specialitiesArray,
        certifications: form.certifications.trim() || null,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      });
      addToast('Application submitted!', 'success');
      setForceForm(false);
    } catch (err) {
      addToast('Failed to submit: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const showForm = !existing || forceForm;

  return (
    <div style={{ padding: '24px', maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">gym啦 Trainer Application</h1>
      </div>

      {/* Pricing info banner */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 24, background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileBadge size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
            <strong>gym啦 Sprint 1</strong> — Free for approved trainers during beta
          </span>
        </div>
      </div>

      {/* Status banners for existing application */}
      {existing && !forceForm && (
        <>
          {existing.status === 'pending' && (
            <div className="gymla-status-banner pending" style={{ marginBottom: 20 }}>
              <Clock size={22} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600 }}>Application Under Review</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Submitted on {existing.appliedAt}. We'll notify you once reviewed.
                </div>
              </div>
            </div>
          )}
          {existing.status === 'approved' && (
            <div className="gymla-status-banner approved" style={{ marginBottom: 20 }}>
              <CheckCircle size={22} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Approved!</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  You can now book studio slots.
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/studios/book')}
              >
                <ExternalLink size={14} /> Book Studio
              </button>
            </div>
          )}
          {existing.status === 'rejected' && (
            <div className="gymla-status-banner rejected" style={{ marginBottom: 20 }}>
              <XCircle size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Application Rejected</div>
                {existing.reviewNote && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Reason: {existing.reviewNote}
                  </div>
                )}
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setForceForm(true)}
              >
                Resubmit
              </button>
            </div>
          )}

          {/* Show submitted details */}
          {!forceForm && (
            <div className="card gymla-apply-card">
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem' }}>Your Application</h3>
              {existing.bio && (
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{existing.bio}</p>
                </div>
              )}
              {existing.specialities?.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Specialities</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {existing.specialities.map(s => (
                      <span key={s} className="tag tag-primary">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {existing.certifications && (
                <div className="form-group">
                  <label className="form-label">Certifications</label>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{existing.certifications}</p>
                </div>
              )}
              {existing.yearsExperience != null && (
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{existing.yearsExperience} years</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Application form */}
      {showForm && (
        <div className="card gymla-apply-card">
          <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1rem' }}>
            {existing?.status === 'rejected' ? 'Resubmit Application' : 'Apply to gym啦'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Profile Photo URL (optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={form.photoUrl}
                onChange={e => handleChange('photoUrl', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio *</label>
              <textarea
                className="form-input"
                placeholder="Tell us about yourself and your training approach..."
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Specialities (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Strength Training, HIIT, Yoga"
                value={form.specialities}
                onChange={e => handleChange('specialities', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Certifications</label>
              <textarea
                className="form-input"
                placeholder="e.g. NASM CPT, ACE, CrossFit Level 2..."
                value={form.certifications}
                onChange={e => handleChange('certifications', e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 5"
                min={0}
                max={50}
                value={form.yearsExperience}
                onChange={e => handleChange('yearsExperience', e.target.value)}
                style={{ maxWidth: 140 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Submitting...' : 'Submit Application'}
              </button>
              {existing?.status === 'rejected' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setForceForm(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
