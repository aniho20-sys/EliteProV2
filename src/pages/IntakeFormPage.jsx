import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { GOALS, FREQUENCIES, EXPERIENCES } from '../data/intakeOptions';
import { useLanguage } from '../i18n/LanguageContext';

export default function IntakeFormPage() {
  const { t } = useLanguage();
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
          <h1 className="intake-title">{t('intake.welcome')}</h1>
          <p className="intake-subtitle">{t('intake.welcome_sub')}</p>
          <div className="intake-progress">
            <div className={`intake-progress-seg${step >= 1 ? ' done' : ''}`} />
            <div className={`intake-progress-seg${step >= 2 ? ' done' : ''}`} />
          </div>
          <p className="intake-step-label">{t('intake.step_of', { step })}</p>
        </div>

        {step === 1 ? (
          <div>
            <div className="intake-section">
              <label className="intake-section-title">
                {t('intake.goals')} <span className="intake-section-hint">{t('intake.select_all')}</span>
              </label>
              <div className="intake-chips">
                {GOALS.map(g => (
                  <button key={g.value} type="button"
                    className={`intake-chip${goals.includes(g.value) ? ' active' : ''}`}
                    onClick={() => toggleGoal(g.value)}
                  >{g.label(t)}</button>
                ))}
                <button type="button"
                  className={`intake-chip${goals.includes('other') ? ' active' : ''}`}
                  onClick={() => toggleGoal('other')}
                >{t('intake.other')}</button>
              </div>
              {goals.includes('other') && (
                <input className="form-input" style={{ marginTop: 12 }}
                  placeholder={t('intake.ph_specify')}
                  value={goalsOther}
                  onChange={e => setGoalsOther(e.target.value)}
                />
              )}
            </div>

            <div className="intake-section">
              <label className="intake-section-title">{t('intake.frequency_q')}</label>
              <div className="intake-chips">
                {FREQUENCIES.map(f => (
                  <button key={f.value} type="button"
                    className={`intake-chip${frequency === f.value ? ' active' : ''}`}
                    onClick={() => setFrequency(f.value)}
                  >{f.label(t)}</button>
                ))}
              </div>
            </div>

            <div className="intake-section">
              <label className="intake-section-title">{t('intake.experience')}</label>
              <div className="intake-chips">
                {EXPERIENCES.map(exp => (
                  <button key={exp.value} type="button"
                    className={`intake-chip${experience === exp.value ? ' active' : ''}`}
                    onClick={() => setExperience(exp.value)}
                  >{exp.label(t)}</button>
                ))}
                <button type="button"
                  className={`intake-chip${experience === 'other' ? ' active' : ''}`}
                  onClick={() => setExperience('other')}
                >{t('intake.other')}</button>
              </div>
              {experience === 'other' && (
                <input className="form-input" style={{ marginTop: 12 }}
                  placeholder={t('intake.ph_specify')}
                  value={experienceOther}
                  onChange={e => setExperienceOther(e.target.value)}
                />
              )}
            </div>

            <div className="intake-actions">
              <button type="button" className="btn btn-primary intake-primary-btn" onClick={handleContinue} disabled={saving}>
                {t('intake.continue')}
              </button>
              <button type="button" className="intake-skip" onClick={handleSkip} disabled={saving}>
                {saving ? t('common.saving') : t('intake.skip')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <button type="button" className="intake-back" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> {t('intake.back')}
            </button>

            <div className="intake-section">
              <label className="intake-section-title">
                {t('intake.injuries_q')}
                <span className="intake-section-hint"> {t('intake.optional')}</span>
              </label>
              <textarea className="form-textarea" rows={3}
                placeholder={t('intake.ph_injuries')}
                value={injuries}
                onChange={e => setInjuries(e.target.value)}
              />
            </div>

            <div className="intake-section">
              <label className="intake-section-title">
                {t('intake.initial_stats')}
                <span className="intake-section-hint"> {t('intake.stats_hint')}</span>
              </label>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('intake.height')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="form-input" type="number" min="100" max="250" step="0.1"
                      value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
                    <span className="text-sm text-muted">cm</span>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('metric.weight')}</label>
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
                {saving ? t('common.saving') : t('intake.get_started')}
              </button>
              <button type="button" className="intake-skip" onClick={handleSkip} disabled={saving}>
                {t('intake.skip')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
