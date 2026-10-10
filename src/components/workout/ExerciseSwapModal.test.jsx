// @vitest-environment jsdom
//
// The exercise picker used while logging a workout (add or swap an exercise).

import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../../context/AppContext');
const { LanguageProvider } = await import('../../i18n/LanguageContext');
const { default: ExerciseSwapModal } = await import('./ExerciseSwapModal');
const { exerciseLibrary, muscleGroups } = await import('../../data/exercises');

function renderModal(props = {}, app = {}) {
  const onSwap = vi.fn();
  render(
    <AppContext.Provider value={{ currentUser: { id: 'c1', role: 'client' }, setLanguage: vi.fn(), ...app }}>
      <LanguageProvider>
        <ExerciseSwapModal exerciseLibrary={exerciseLibrary} muscleGroups={muscleGroups}
          onSwap={onSwap} onClose={vi.fn()} mode="add" {...props} />
      </LanguageProvider>
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
