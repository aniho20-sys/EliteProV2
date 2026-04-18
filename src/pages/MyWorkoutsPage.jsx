import { useApp } from '../context/AppContext';
import { Play, ClipboardList } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { normalizeSets } from '../utils/workoutUtils';

const isSafeUrl = (url) => /^https?:\/\//i.test(url?.trim() || '');

export default function MyWorkoutsPage() {
  const { currentUser, getWorkoutPlans, getExercises } = useApp();
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const exercises = getExercises();

  const getExerciseName = (id, fallback) => exercises.find(e => e.id === id)?.name || fallback || id;
  const getExercise = (id) => exercises.find(e => e.id === id);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Workouts</h1>
        <p className="page-subtitle">{plans.length} workout plans assigned by your coach</p>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No workout plans assigned yet"
          description={currentUser.trainerId
            ? 'Your coach will create plans for you soon. Check back in a bit.'
            : 'Connect to a coach first, then they can assign plans to you.'}
          action={!currentUser.trainerId ? { label: 'Connect Coach', to: '/profile' } : undefined}
        />
      ) : (
        plans.map(p => (
          <div key={p.id} className="card mb-16">
            <div className="card-header">
              <h3 className="card-title">{p.name}</h3>
              <span className="tag tag-primary">{p.day}</span>
            </div>
            {p.exercises.map((ex, i) => {
              const exercise = getExercise(ex.exerciseId);
              return (
                <div key={i} className="card mb-16" style={{ background: 'var(--bg-hover)', border: 'none', padding: 14 }}>
                  <div className="flex-between">
                    <div>
                      <div className="fw-bold">{getExerciseName(ex.exerciseId, ex.name)}</div>
                      <div className="flex gap-8 mt-8">
                        <span className="tag tag-primary">{exercise?.muscle}</span>
                        <span className="tag tag-accent">{exercise?.equipment}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      {(() => {
                        const sets = normalizeSets(ex);
                        const reps = sets.map(s => s.reps);
                        const weights = sets.map(s => s.weight);
                        const allSameReps = reps.every(r => r === reps[0]);
                        const hasWeight = weights.some(w => w > 0);
                        return (
                          <>
                            <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
                              {allSameReps ? `${sets.length} x ${reps[0]}` : `${sets.length} sets`}
                            </div>
                            {hasWeight && <div className="text-sm text-muted">
                              {weights.every(w => w === weights[0]) ? `${weights[0]}kg` : weights.join('/') + 'kg'}
                            </div>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {exercise?.description && <p className="text-sm text-muted mt-8">{exercise.description}</p>}
                  {ex.notes && <p className="text-sm mt-8" style={{ color: 'var(--warning)', fontStyle: 'italic' }}>{ex.notes}</p>}
                  {(() => {
                    const url = ex.videoUrl || exercise?.videoUrl;
                    return url && isSafeUrl(url) ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video mt-8">
                        <Play size={14} /> Watch Demo
                      </a>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
