// @vitest-environment jsdom
//
// The exercise picker used while logging a workout (add or swap an exercise).

import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../../context/AppContext');
const { LanguageProvider } = await import('../../i18n/LanguageContext');
const { ToastProvider } = await import('../../context/ToastContext');
const { default: ExerciseSwapModal } = await import('./ExerciseSwapModal');
const { exerciseLibrary, muscleGroups, equipmentTypes } = await import('../../data/exercises');

function renderModal(props = {}, app = {}) {
  const onSwap = vi.fn();
  render(
    <AppContext.Provider value={{ currentUser: { id: 'c1', role: 'client' }, setLanguage: vi.fn(), equipmentTypes, addExercise: vi.fn(), ...app }}>
      <LanguageProvider><ToastProvider>
        <ExerciseSwapModal exerciseLibrary={exerciseLibrary} muscleGroups={muscleGroups}
          onSwap={onSwap} onClose={vi.fn()} mode="add" {...props} />
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
  return { onSwap };
}

afterEach(cleanup);

describe('searching the library while logging', () => {
  // B43 renamed starter exercises ("Barbell Curl" → "Bicep Curl (Barbell)"); the old name
  // is kept as an alias, and searching it must still find the exercise.
  test('the old name of a renamed exercise still finds it', () => {
    const { onSwap } = renderModal();
    fireEvent.change(screen.getByPlaceholderText('Search exercises…'), { target: { value: 'Barbell Curl' } });
    fireEvent.click(screen.getByText('Bicep Curl (Barbell)'));
    expect(onSwap).toHaveBeenCalledWith(expect.objectContaining({ id: 'barbell-curl' }));
  });

  test('the family name lists every equipment version', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Search exercises…'), { target: { value: 'bicep curl' } });
    for (const eq of ['Barbell', 'Dumbbell', 'Cable', 'Machine']) expect(screen.getByText(`Bicep Curl (${eq})`)).toBeTruthy();
  });
});

describe('a custom exercise added while logging (Ani 2026-10-10)', () => {
  const coach = (over = {}) => ({ currentUser: { id: 't1', role: 'trainer' }, addExercise: vi.fn(async (ex) => ex), ...over });
  const openCustom = (name) => {
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Sled Push, Band Pull-Apart…'), { target: { value: name } });
  };
  const addButton = (name) => screen.getByRole('button', { name: `Add "${name}"` });

  test('a coach\'s is saved to their library and goes on the log with the same id', async () => {
    const app = coach();
    const { onSwap } = renderModal({}, app);
    openCustom('Sled Push');
    expect(screen.getByText('Saved to your exercise library, so it is there next time.')).toBeTruthy();
    expect(addButton('Sled Push').disabled).toBe(true); // equipment and a muscle first
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Other' } });
    expect(addButton('Sled Push').disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Quadriceps' }));
    fireEvent.click(addButton('Sled Push'));

    await waitFor(() => expect(app.addExercise).toHaveBeenCalledTimes(1));
    const saved = app.addExercise.mock.calls[0][0];
    expect(saved).toMatchObject({ name: 'Sled Push', equipment: 'Other', muscle: 'Quadriceps' });
    expect(saved.id).toMatch(/^ex-\d+$/);
    expect(onSwap).toHaveBeenCalledWith(expect.objectContaining({ id: saved.id, name: 'Sled Push', unit: 'weight_reps' }));
    expect(await screen.findByText('Exercise added')).toBeTruthy();
  });

  test('the same name on the same equipment is not saved twice; on other equipment it is a new version', () => {
    const app = coach();
    renderModal({}, app);
    openCustom('Bicep Curl');
    fireEvent.click(screen.getByRole('button', { name: 'Biceps' }));
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Cable' } });
    expect(addButton('Bicep Curl').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Kettlebell' } });
    expect(addButton('Bicep Curl').disabled).toBe(false);
  });

  test('a failed save says so, and the exercise stays on the log', async () => {
    const app = coach({ addExercise: vi.fn(async () => { throw new Error('offline'); }) });
    const { onSwap } = renderModal({}, app);
    openCustom('Sled Push');
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quadriceps' }));
    fireEvent.click(addButton('Sled Push'));
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Failed to save exercise')).toBeTruthy();
  });

  test('a client\'s stays a one-off on the log, as before', () => {
    const app = { addExercise: vi.fn() };
    const { onSwap } = renderModal({}, app);
    openCustom('Sled Push');
    expect(screen.queryByLabelText('Equipment')).toBeNull();
    fireEvent.click(addButton('Sled Push'));
    expect(app.addExercise).not.toHaveBeenCalled();
    expect(onSwap).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sled Push', custom: true }));
  });
});
