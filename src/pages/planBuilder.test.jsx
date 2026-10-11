// @vitest-environment jsdom
//
// Building a plan faster (Ani 2026-10-11, from the coach walkthrough: ~30 taps for five
// exercises, every set typed by hand, no load, no rest, "squat" listing Squat 7th).
// Driven through the real Plans page. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: WorkoutPlansPage } = await import('./WorkoutPlansPage');
const { exerciseLibrary, equipmentTypes } = await import('../data/exercises');
const { applyPlanSetChange } = await import('../utils/workoutUtils');
const { rankExerciseMatches } = await import('../utils/exerciseSearch');
const { sortExercisesByName, liveExercises } = await import('../utils/exerciseUtils');

const COACH = { id: 'coach-1', name: 'Ani', role: 'trainer' };
const AMY = { id: 'amy', name: 'Amy Chen', role: 'client', trainerId: 'coach-1' };

function renderPlans(over = {}) {
  const app = {
    currentUser: COACH, setLanguage: vi.fn(), equipmentTypes,
    getWorkoutPlans: () => over.plans || [], getClients: () => [AMY], getExercises: () => exerciseLibrary,
    addWorkoutPlan: vi.fn(async (p) => ({ ...p, id: 'plan-1' })), updateWorkoutPlan: vi.fn(), deleteWorkoutPlan: vi.fn(),
    addExercise: vi.fn(), updateExercise: vi.fn(), getWorkoutLogs: () => [], saveAsTemplate: vi.fn(), getTemplates: () => [],
    ...over,
  };
  render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider><MemoryRouter>
        <WorkoutPlansPage />
      </MemoryRouter></ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
  return app;
}
const openNewPlan = () => { fireEvent.click(screen.getAllByRole('button', { name: /Create Plan/ })[0]); return document.querySelector('.modal'); };
const addExercise = (modal, query, name) => {
  fireEvent.change(within(modal).getByPlaceholderText('Search exercises...'), { target: { value: query } });
  fireEvent.click(within(modal).getByText(name));
};

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Set 1 carries down (plans only)', () => {
  const sets = (...reps) => reps.map(r => ({ reps: r, weight: '' }));
  test('fills the sets still empty or still the same as Set 1', () => {
    expect(applyPlanSetChange(sets('', '', ''), 0, 'reps', '5').map(s => s.reps)).toEqual(['5', '5', '5']);
    expect(applyPlanSetChange(sets('5', '5', '5'), 0, 'reps', '8').map(s => s.reps)).toEqual(['8', '8', '8']);
  });
  test('a set changed by hand keeps its value; editing a later set touches only that set', () => {
    expect(applyPlanSetChange(sets('5', '3', '5'), 0, 'reps', '6').map(s => s.reps)).toEqual(['6', '3', '6']);
    expect(applyPlanSetChange(sets('5', '5', '5'), 2, 'reps', '3').map(s => s.reps)).toEqual(['5', '5', '3']);
  });
});

describe('search puts the closest name first', () => {
  const picker = (q) => rankExerciseMatches(sortExercisesByName(liveExercises(exerciseLibrary)), q).map(e => e.name);
  test('"squat" leads with the Squats, not Leg Press or Lunge', () => {
    expect(picker('squat').slice(0, 3)).toEqual(['Squat (Barbell)', 'Squat (Dumbbell)', 'Squat (Machine)']);
  });
  test('"bench" leads with Bench Press', () => {
    expect(picker('bench')[0]).toBe('Bench Press (Barbell)');
  });
});

describe('building a plan on the Plans page', () => {
  test('reps typed once, a target load, a rest time — all saved', async () => {
    const app = renderPlans();
    const modal = openNewPlan();
    fireEvent.change(within(modal).getAllByRole('textbox')[0], { target: { value: 'Strength A' } });
    fireEvent.change(within(modal).getAllByRole('combobox')[0], { target: { value: 'amy' } });
    addExercise(modal, 'squat', 'Squat (Barbell)');
    expect(within(modal).getAllByRole('textbox', { name: /Set \d reps/ })).toHaveLength(3);

    fireEvent.change(within(modal).getByRole('textbox', { name: 'Set 1 reps' }), { target: { value: '5' } });
    fireEvent.change(within(modal).getByRole('spinbutton', { name: 'Set 1 kg' }), { target: { value: '80' } });
    fireEvent.change(within(modal).getByRole('combobox', { name: 'Rest Timer' }), { target: { value: '180' } });
    expect(within(modal).getByRole('textbox', { name: 'Set 3 reps' }).value).toBe('5');
    expect(within(modal).getByRole('spinbutton', { name: 'Set 3 kg' }).value).toBe('80');

    fireEvent.submit(modal.querySelector('form'));
    await waitFor(() => expect(app.addWorkoutPlan).toHaveBeenCalled());
    const [ex] = app.addWorkoutPlan.mock.calls[0][0].exercises;
    expect(ex).toMatchObject({ exerciseId: 'squat', rest: 180 });
    expect(ex.sets.map(s => [s.reps, s.weight])).toEqual([['5', '80'], ['5', '80'], ['5', '80']]);
  });

  test('the picker on the page lists the Squats first for "squat"', () => {
    renderPlans();
    const modal = openNewPlan();
    fireEvent.change(within(modal).getByPlaceholderText('Search exercises...'), { target: { value: 'squat' } });
    const names = [...modal.querySelectorAll('.contact-item .text-sm')].map(n => n.textContent);
    expect(names.slice(0, 3)).toEqual(['Squat (Barbell)', 'Squat (Dumbbell)', 'Squat (Machine)']);
  });

  test('a timed exercise arrives as Time (Plank)', () => {
    renderPlans();
    const modal = openNewPlan();
    addExercise(modal, 'plank', 'Plank');
    expect(within(modal).getByRole('button', { name: 'Time' }).className).toContain('active');
  });

  test('the plan list shows the target load', () => {
    renderPlans({ plans: [{ id: 'p1', name: 'Strength A', clientId: 'amy', trainerId: 'coach-1',
      exercises: [{ exerciseId: 'squat', unit: 'weight_reps', rest: 180, sets: [{ reps: '5', weight: '80' }, { reps: '5', weight: '80' }] }] }] });
    fireEvent.click(screen.getByText('Strength A'));
    expect(screen.getByText(/2 × 5 reps @ 80kg/)).toBeTruthy();
  });
});
