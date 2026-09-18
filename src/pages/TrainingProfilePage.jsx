import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { GOALS, FREQUENCIES, EXPERIENCES } from '../data/intakeOptions';
import { useLanguage } from '../i18n/LanguageContext';
import { SkeletonCard } from '../components/Skeleton';

// Lets a client revisit/edit their onboarding answers anytime — not just the
// one-time IntakeFormPage gate. Same questions, same chip styling, but as a
// single regular-density page (no step wizard, no Skip) since this is a
// deliberate revisit, not a first-time forced flow.
export default function TrainingProfilePage() {
  const { t } = useLanguage();
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
        <div className="page-header"><h1 className="page-title">{t('tprofile.title')}</h1></div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('tprofile.title')}</h1>
        <p className="page-subtitle">{t('tprofile.subtitle')}</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
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
            {t('tprofile.body_stats')}
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
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="intake-skip" onClick={() => navigate('/profile')} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
