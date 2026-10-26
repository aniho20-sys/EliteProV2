// @vitest-environment jsdom
//
// Swapping an exercise mid-workout (Ani 2026-10-26: "換動作果時會出現返原本動作嘅pr").
// The plan card starts with last time's weights for its exercise; a swap kept them, so the
// new exercise showed the old one's weight as a NEW PR and saved it as its own. Driven
// through the real log page, with the app's data replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: WorkoutLogPage } = await import('./WorkoutLogPage');

const ME = { id: 'amy', name: 'Amy Chen', role: 'client', trainerId: 'coach-1' };
const SQUAT = { id: 'squat', name: 'Back Squat', muscle: 'Quads', unit: 'weight_reps' };
const GOBLET = { id: 'goblet', name: 'Goblet Squat', muscle: 'Quads', unit: 'weight_reps' };
const PLAN = { id: 'plan-a', clientId: 'amy', trainerId: 'coach-1', name: 'Legs',
  exercises: [{ exerciseId: 'squat', sets: 3, reps: '5', rest: 120, notes: 'Brace hard' }] };
const LAST = { id: 'log-1', clientId: 'amy', planId: 'plan-a', date: '2026-10-20',
  entries: [{ exerciseId: 'squat', unit: 'weight_reps', sets: [100, 100, 100].map(weight => ({ weight, reps: 5 })) }] };

function renderLog() {
  const addWorkoutLog = vi.fn(async () => {});
  const app = {
    currentUser: ME, setLanguage: vi.fn(),
    getWorkoutPlans: () => [PLAN], getWorkoutLogs: () => [LAST], getExercises: () => [SQUAT, GOBLET],
    getPersonalRecords: () => ({ squat: { weight: 100, date: '2026-10-20' }, goblet: { weight: 24, date: '2026-09-01' } }),
    muscleGroups: [], addWorkoutLog, updateWorkoutLog: vi.fn(), checkAndAwardBadges: vi.fn(async () => []),
    watchClientHistory: vi.fn(() => vi.fn()), getClient: () => undefined,
  };
  render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[{ pathname: '/log', state: { planId: 'plan-a' } }]}>
          <Routes><Route path="*" element={<WorkoutLogPage />} /></Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
  return { addWorkoutLog };
}

const weights = () => screen.getAllByLabelText('kg').map(i => i.value);
function swapTo(name) {
  fireEvent.click(screen.getByTitle('Swap exercise'));
  fireEvent.click(within(document.querySelector('.swap-exercise-list')).getByText(name));
}

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('swapping an exercise during a workout', () => {
  test('the card starts with last time\'s squat weights (so the test below starts from the bug)', () => {
    renderLog();
    expect(weights()).toEqual(['100', '100', '100']);
    expect(screen.getByText(/PR: 100kg/)).toBeTruthy();
    expect(screen.getByText('Brace hard')).toBeTruthy();
  });

  test('after a swap: the new exercise\'s PR, empty sets, no NEW PR, none of the old plan line', () => {
    renderLog();
    swapTo('Goblet Squat');
    expect(weights()).toEqual(['', '', '']);
    expect(screen.getByText(/PR: 24kg/)).toBeTruthy();
    expect(screen.queryByText(/PR: 100kg/)).toBeNull();
    expect(screen.queryByText('NEW PR!')).toBeNull();
    expect(screen.queryByText(/3 x 5/)).toBeNull();
    expect(screen.queryByText('Brace hard')).toBeNull();
  });

  test('saving straight after a swap records no squat weight under the new exercise', async () => {
    const { addWorkoutLog } = renderLog();
    swapTo('Goblet Squat');
    fireEvent.click(screen.getAllByText('Save Workout')[0]);
    await vi.waitFor(() => expect(addWorkoutLog).toHaveBeenCalled());
    const [entry] = addWorkoutLog.mock.calls[0][0].entries;
    expect(entry.exerciseId).toBe('goblet');
    expect(entry.sets).toEqual([]);
  });
});
