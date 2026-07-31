import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
  const [step, setStep] = useState(1);

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

  const handleContinue = () => {
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
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          <p className="intake-subtitle">Help your coach tailor a programme just for you.</p>
          <div className="intake-progress">
            <div className={`intake-progress-seg${step >= 1 ? ' done' : ''}`} />
            <div className={`intake-progress-seg${step >= 2 ? ' done' : ''}`} />
          </div>
          <p className="intake-step-label">Step {step} of 2</p>
        </div>

        {step === 1 ? (
          <div>
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

            <div className="intake-actions">
              <button type="button" className="btn btn-primary intake-primary-btn" onClick={handleContinue} disabled={saving}>
                Continue
              </button>
              <button type="button" className="intake-skip" onClick={handleSkip} disabled={saving}>
                {saving ? 'Saving…' : 'Skip for now'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <button type="button" className="intake-back" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Back
            </button>

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
                Initial Body Stats
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
                {saving ? 'Saving…' : 'Get Started'}
              </button>
              <button type="button" className="intake-skip" onClick={handleSkip} disabled={saving}>
                Skip for now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
