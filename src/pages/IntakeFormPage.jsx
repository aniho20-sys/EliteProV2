import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const GOALS = ['Weight Loss', 'Muscle Gain', 'Improve Fitness', 'Athletic Performance'];
const FREQUENCIES = ['1x', '2x', '3x', '4x', '5x or more'];
const EXPERIENCES = [
  { value: 'Beginner', label: 'Beginner (less than 1 year)' },
  { value: 'Intermediate', label: 'Intermediate (1–3 years)' },
  { value: 'Advanced', label: 'Advanced (3+ years)' },
];

export default function IntakeFormPage() {
  const { currentUser, saveIntakeForm } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState([]);
  const [goalsOther, setGoalsOther] = useState('');
  const [frequency, setFrequency] = useState('');
  const [experience, setExperience] = useState('');
  const [experienceOther, setExperienceOther] = useState('');
  const [injuries, setInjuries] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const toggleGoal = (g) =>
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleSkip = async () => {
    setSaving(true);
    try {
      await saveIntakeForm(currentUser.id, { skipped: true });
    } catch {
      toast('Failed to save', 'error');
      setSaving(false);
    }
  };

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
    } catch {
      toast('Failed to save, please try again', 'error');
      setSaving(false);
    }
  };

  return (
    <div className="intake-page">
      <div className="intake-card">
        <div className="intake-header">
          <h1 className="intake-title">Welcome!</h1>
          <p className="intake-subtitle">Help your coach tailor a programme just for you. Takes 2 minutes.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Training Goals <span className="text-muted" style={{ fontWeight: 400 }}>(select all that apply)</span></label>
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
              <input className="form-input" style={{ marginTop: 8 }}
                placeholder="Please specify..."
                value={goalsOther}
                onChange={e => setGoalsOther(e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">How many times per week can you train?</label>
            <div className="intake-chips">
              {FREQUENCIES.map(f => (
                <button key={f} type="button"
                  className={`intake-chip${frequency === f ? ' active' : ''}`}
                  onClick={() => setFrequency(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Training Experience</label>
            <div className="intake-radio-group">
              {EXPERIENCES.map(exp => (
                <label key={exp.value} className="intake-radio">
                  <input type="radio" name="experience" value={exp.value}
                    checked={experience === exp.value}
                    onChange={() => setExperience(exp.value)}
                  />
                  {exp.label}
                </label>
              ))}
              <label className="intake-radio">
                <input type="radio" name="experience" value="other"
                  checked={experience === 'other'}
                  onChange={() => setExperience('other')}
                />
                Other
              </label>
            </div>
            {experience === 'other' && (
              <input className="form-input" style={{ marginTop: 8 }}
                placeholder="Please specify..."
                value={experienceOther}
                onChange={e => setExperienceOther(e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Any injuries or physical conditions to be aware of?
              <span className="text-muted" style={{ fontWeight: 400 }}> (Optional)</span>
            </label>
            <textarea className="form-textarea" rows={3}
              placeholder="e.g. Left knee injury, lower back pain, latex allergy..."
              value={injuries}
              onChange={e => setInjuries(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Initial Body Stats
              <span className="text-muted" style={{ fontWeight: 400 }}> (Optional — your coach can measure these for you)</span>
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving…' : 'Get Started'}
            </button>
            <button type="button" className="btn btn-outline" style={{ width: '100%' }}
              onClick={handleSkip} disabled={saving}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
