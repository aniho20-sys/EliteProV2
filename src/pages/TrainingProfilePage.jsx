import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { GOALS, FREQUENCIES, EXPERIENCES } from '../data/intakeOptions';
import { SkeletonCard } from '../components/Skeleton';

// Lets a client revisit/edit their onboarding answers anytime — not just the
// one-time IntakeFormPage gate. Same questions, same chip styling, but as a
// single regular-density page (no step wizard, no Skip) since this is a
// deliberate revisit, not a first-time forced flow.
export default function TrainingProfilePage() {
  const { currentUser, getIntakeForm, saveIntakeForm } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState([]);
  const [goalsOther, setGoalsOther] = useState('');
  const [frequency, setFrequency] = useState('');
  const [experience, setExperience] = useState('');
  const [experienceOther, setExperienceOther] = useState('');
  const [injuries, setInjuries] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    let cancelled = false;
    getIntakeForm(currentUser.id).then(form => {
      if (cancelled || !form) return;
      setGoals(form.goals || []);
      setGoalsOther(form.goalsOther || '');
      setFrequency(form.frequency || '');
      setExperience(form.experience || '');
      setExperienceOther(form.experienceOther || '');
      setInjuries(form.injuries || '');
      setHeight(form.height ?? '');
      setWeight(form.weight ?? '');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const toggleGoal = (g) =>
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (goals.length === 0 && !goalsOther.trim()) {
      toast('Please select at least one training goal', 'error');
      return;
    }
    if (!frequency) {
      toast('Please select your training frequency', 'error');
      return;
    }
    if (!experience) {
      toast('Please select your experience level', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveIntakeForm(currentUser.id, {
        goals,
        goalsOther: goalsOther.trim(),
        frequency,
        experience,
        experienceOther: experienceOther.trim(),
        injuries: injuries.trim(),
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
      });
      toast('Training profile saved');
      navigate('/profile');
    } catch {
      toast('Failed to save, please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Training Profile</h1></div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Training Profile</h1>
        <p className="page-subtitle">Keep this up to date — your coach uses it to plan your sessions safely.</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="intake-section">
          <label className="intake-section-title">
            Training Goals <span className="intake-section-hint">(select all that apply)</span>
          </label>
          <div className="intake-chips">
            {GOALS.map(g => (
              <button key={g} type="button"
                className={`intake-chip${goals.includes(g) ? ' active' : ''}`}
                onClick={() => toggleGoal(g)}
              >{g}</button>
            ))}
            <button type="button"
              className={`intake-chip${goals.includes('other') ? ' active' : ''}`}
              onClick={() => toggleGoal('other')}
            >Other</button>
          </div>
          {goals.includes('other') && (
            <input className="form-input" style={{ marginTop: 12 }}
              placeholder="Please specify..."
              value={goalsOther}
              onChange={e => setGoalsOther(e.target.value)}
            />
          )}
        </div>

        <div className="intake-section">
          <label className="intake-section-title">How many times per week can you train?</label>
          <div className="intake-chips">
            {FREQUENCIES.map(f => (
              <button key={f} type="button"
                className={`intake-chip${frequency === f ? ' active' : ''}`}
                onClick={() => setFrequency(f)}
              >{f}</button>
            ))}
          </div>
        </div>

        <div className="intake-section">
          <label className="intake-section-title">Training Experience</label>
          <div className="intake-chips">
            {EXPERIENCES.map(exp => (
              <button key={exp.value} type="button"
                className={`intake-chip${experience === exp.value ? ' active' : ''}`}
                onClick={() => setExperience(exp.value)}
              >{exp.label}</button>
            ))}
            <button type="button"
              className={`intake-chip${experience === 'other' ? ' active' : ''}`}
              onClick={() => setExperience('other')}
            >Other</button>
          </div>
          {experience === 'other' && (
            <input className="form-input" style={{ marginTop: 12 }}
              placeholder="Please specify..."
              value={experienceOther}
              onChange={e => setExperienceOther(e.target.value)}
            />
          )}
        </div>

        <div className="intake-section">
          <label className="intake-section-title">
            Any injuries or physical conditions to be aware of?
            <span className="intake-section-hint"> (Optional)</span>
          </label>
          <textarea className="form-textarea" rows={3}
            placeholder="e.g. Left knee injury, lower back pain, latex allergy..."
            value={injuries}
            onChange={e => setInjuries(e.target.value)}
          />
        </div>

        <div className="intake-section">
          <label className="intake-section-title">
            Body Stats
            <span className="intake-section-hint"> (Optional — your coach can measure these for you)</span>
          </label>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="form-input" type="number" min="100" max="250" step="0.1"
                  value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
                <span className="text-sm text-muted">cm</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Weight</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="form-input" type="number" min="20" max="300" step="0.1"
                  value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" />
                <span className="text-sm text-muted">kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="intake-actions">
          <button type="submit" className="btn btn-primary intake-primary-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="intake-skip" onClick={() => navigate('/profile')} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
