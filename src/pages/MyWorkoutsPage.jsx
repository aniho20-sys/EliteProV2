import { useApp } from '../context/AppContext';
import { Play } from 'lucide-react';

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
        <div className="card empty-state">
          <p className="empty-state-text">No workout plans assigned yet. Your coach will create them for you.</p>
        </div>
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
                      <div className="fw-bold" style={{ fontSize: '1.1rem' }}>{ex.sets} x {ex.reps}</div>
                      {ex.weight > 0 && <div className="text-sm text-muted">{ex.weight}kg</div>}
                    </div>
                  </div>
                  {exercise?.description && <p className="text-sm text-muted mt-8">{exercise.description}</p>}
                  {ex.notes && <p className="text-sm mt-8" style={{ color: 'var(--warning)', fontStyle: 'italic' }}>{ex.notes}</p>}
                  {exercise?.videoUrl && (
                    <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-video mt-8">
                      <Play size={14} /> Watch Demo
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
