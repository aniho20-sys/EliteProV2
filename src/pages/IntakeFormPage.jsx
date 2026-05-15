import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const GOALS = ['減脂', '增肌', '提升體能', '運動表現'];
const FREQUENCIES = ['1次', '2次', '3次', '4次', '5次或以上'];
const EXPERIENCES = [
  { value: '初學者', label: '初學者（少於1年）' },
  { value: '有基礎', label: '有基礎（1–3年）' },
  { value: '資深', label: '資深（3年以上）' },
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
      toast('請選擇至少一個訓練目標', 'error');
      return;
    }
    if (!frequency) {
      toast('請選擇每週訓練次數', 'error');
      return;
    }
    if (!experience) {
      toast('請選擇訓練經驗', 'error');
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
      toast('儲存失敗，請重試', 'error');
      setSaving(false);
    }
  };

  return (
    <div className="intake-page">
      <div className="intake-card">
        <div className="intake-header">
          <h1 className="intake-title">歡迎加入！</h1>
          <p className="intake-subtitle">讓教練更了解你，只需 2 分鐘，幫助度身訂造訓練計劃</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">訓練目標（可多選）</label>
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
              >其他</button>
            </div>
            {goals.includes('other') && (
              <input className="form-input" style={{ marginTop: 8 }}
                placeholder="請說明..."
                value={goalsOther}
                onChange={e => setGoalsOther(e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">每週可以訓練幾次？</label>
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
            <label className="form-label">訓練經驗</label>
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
                其他
              </label>
            </div>
            {experience === 'other' && (
              <input className="form-input" style={{ marginTop: 8 }}
                placeholder="請說明..."
                value={experienceOther}
                onChange={e => setExperienceOther(e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              有冇傷患或需注意的身體狀況？
              <span className="text-muted" style={{ fontWeight: 400 }}> （選填）</span>
            </label>
            <textarea className="form-textarea" rows={3}
              placeholder="例：左膝舊患、腰背痛、對乳膠過敏..."
              value={injuries}
              onChange={e => setInjuries(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              初始身體數據
              <span className="text-muted" style={{ fontWeight: 400 }}> （選填，可由教練幫你量度）</span>
            </label>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">身高</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="form-input" type="number" min="100" max="250" step="0.1"
                    value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
                  <span className="text-sm text-muted">cm</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">體重</label>
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
              {saving ? '儲存中…' : '完成並開始'}
            </button>
            <button type="button" className="btn btn-outline" style={{ width: '100%' }}
              onClick={handleSkip} disabled={saving}>
              稍後填寫（跳過）
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
