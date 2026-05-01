import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Play, ClipboardList, Dumbbell } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { normalizeSets } from '../utils/workoutUtils';
import { isSafeUrl } from '../utils/urlUtils';
import { resolveExerciseName } from '../utils/exerciseUtils';

export default function MyWorkoutsPage() {
  const { currentUser, getWorkoutPlans, getExercises } = useApp();
  const navigate = useNavigate();
  const plans = getWorkoutPlans({ clientId: currentUser.id });
  const exercises = getExercises();

  const getExerciseName = (id, fallback) => resolveExerciseName(exercises, id, fallback);
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
            ? 'Your coach hasn\'t assigned any plans yet. Message them to get started.'
            : 'Connect to a coach first — they will assign workout plans for you.'}
          action={
            !currentUser.trainerId
              ? { label: 'Connect to a Coach', to: '/profile' }
              : { label: 'Message Your Coach', to: '/messages' }
          }
        />
      ) : (
        plans.map(p => (
          <div key={p.id} className="card mb-16">
            <div className="card-header">
              <div>
                <h3 className="card-title">{p.name}</h3>
                {p.day && <span className="tag tag-primary">{p.day}</span>}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/log', { state: { planId: p.id } })}
              >
                <Dumbbell size={14} /> Start Workout
              </button>
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
