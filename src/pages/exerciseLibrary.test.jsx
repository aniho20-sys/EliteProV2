// @vitest-environment jsdom
//
// Exercise Library, after the 2026-10-10 critique (B45): adding an exercise cannot quietly
// save the wrong equipment, a coach's duplicates are pointed out and the right merge is
// offered first, and the count says what the search shows. Firebase is replaced (#38).

import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

window.scrollTo = () => {};
vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: ExerciseLibraryPage } = await import('./ExerciseLibraryPage');
const { exerciseLibrary, muscleGroups, equipmentTypes } = await import('../data/exercises');

const OWN_DUPLICATE = { id: 'ex-own-1', name: 'Cable Bicep Curl', muscle: 'Biceps', equipment: 'Cable', trainerId: 't1' };
const OWN_UNIQUE = { id: 'ex-own-2', name: 'Sled Push', muscle: 'Quadriceps', equipment: 'Other', trainerId: 't1' };

function renderLibrary(over = {}) {
  const app = {
    currentUser: { id: 't1', role: 'trainer' }, setLanguage: vi.fn(), muscleGroups, equipmentTypes,
    getExercises: () => [OWN_DUPLICATE, OWN_UNIQUE, ...exerciseLibrary],
    addExercise: vi.fn(async (ex) => ex), updateExercise: vi.fn(async () => {}), deleteExercise: vi.fn(),
    getExerciseOverride: () => null, upsertExerciseOverride: vi.fn(), deleteExerciseOverride: vi.fn(),
    ...over,
  };
  render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider><MemoryRouter>
        <ExerciseLibraryPage />
      </MemoryRouter></ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
  return app;
}
const openAdd = () => {
  fireEvent.click(screen.getByRole('button', { name: /Add Exercise/ }));
  return document.querySelector('.modal');
};
const typeName = (modal, name) => fireEvent.change(within(modal).getAllByRole('textbox')[0], { target: { value: name } });

afterEach(cleanup);

describe('adding an exercise', () => {
  test('no equipment is preset; it follows the name until picked by hand', () => {
    const modal = openAdd(renderLibrary());
    const equipment = within(modal).getByRole('combobox');
    expect(equipment.value).toBe('');
    typeName(modal, 'Cable Lat Prayer');
    expect(equipment.value).toBe('Cable');
    fireEvent.change(equipment, { target: { value: 'Machine' } });
    typeName(modal, 'Cable Lat Prayer Pull');
    expect(equipment.value).toBe('Machine'); // their choice stands
  });

  test('a name that says one equipment while another is picked is called out, never called fine', () => {
    const modal = openAdd(renderLibrary());
    typeName(modal, 'Cable Kneeling Crunch');
    fireEvent.change(within(modal).getByRole('combobox'), { target: { value: 'Barbell' } });
    expect(within(modal).getByRole('alert').textContent).toBe('The name says Cable, but Equipment is set to Barbell.');
    expect(within(modal).queryByText(/version is fine/)).toBeNull();
  });

  test('the same exercise typed another way is caught before it is saved twice', () => {
    const modal = openAdd(renderLibrary());
    typeName(modal, 'Bicep Curls');
    fireEvent.change(within(modal).getByRole('combobox'), { target: { value: 'Dumbbell' } });
    expect(within(modal).getByText('This exercise already exists (Dumbbell).')).toBeTruthy();
  });

  test('the variant hint names each other equipment once', () => {
    const modal = openAdd(renderLibrary());
    typeName(modal, 'Bicep Curl');
    fireEvent.change(within(modal).getByRole('combobox'), { target: { value: 'Kettlebell' } });
    expect(within(modal).getByText(/You already have this movement on Cable, Barbell, Dumbbell, Machine\./)).toBeTruthy();
  });
});

describe('duplicates and merging', () => {
  test('a coach\'s own duplicate says what it duplicates; a unique one says nothing', () => {
    renderLibrary();
    const row = screen.getByText('Cable Bicep Curl').closest('.exercise-row');
    expect(within(row).getByText('Same as Bicep Curl (Cable)')).toBeTruthy();
    const unique = screen.getByText('Sled Push').closest('.exercise-row');
    expect(unique.querySelector('.exercise-row-dupe')).toBeNull();
  });

  test('students are not shown the duplicate note', () => {
    renderLibrary({ currentUser: { id: 'c1', role: 'client', trainerId: 't1' } });
    expect(screen.queryByText(/Same as/)).toBeNull();
  });

  test('merging offers the likely twin first', async () => {
    renderLibrary();
    fireEvent.click(screen.getByText('Cable Bicep Curl'));
    fireEvent.click(await screen.findByRole('button', { name: /Merge/ }));
    const first = document.querySelector('.merge-candidate-list .merge-candidate');
    expect(within(first).getByText('Bicep Curl (Cable)')).toBeTruthy();
    expect(within(first).getByText('Likely the same exercise')).toBeTruthy();
  });
});

describe('the count', () => {
  test('says how many a search shows, out of the live total', () => {
    renderLibrary({ getExercises: () => [{ ...OWN_UNIQUE, mergedInto: 'x' }, ...exerciseLibrary] });
    expect(screen.getByText(`${exerciseLibrary.length} exercises available`)).toBeTruthy(); // merged one not counted
    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'shrug' } });
    expect(screen.getByText(`4 of ${exerciseLibrary.length} exercises`)).toBeTruthy();
  });
});
