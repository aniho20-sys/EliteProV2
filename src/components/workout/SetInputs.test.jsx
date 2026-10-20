// @vitest-environment jsdom
//
// B52 accessibility: the +/− steppers and the number boxes were nameless to a screen reader
// ("button", "button", "text field"). Firebase is replaced (#38).
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../../context/AppContext');
const { LanguageProvider } = await import('../../i18n/LanguageContext');
const { default: SetInputs } = await import('./SetInputs');

afterEach(() => { cleanup(); });

function renderSet(unit, onUpdate = vi.fn()) {
  render(
    <AppContext.Provider value={{ currentUser: null, setLanguage: vi.fn() }}>
      <LanguageProvider><SetInputs set={{ weight: '60', reps: '8' }} setIdx={0} unit={unit} onUpdate={onUpdate} /></LanguageProvider>
    </AppContext.Provider>,
  );
  return onUpdate;
}

describe('every control in a set has a name', () => {
  test('weight × reps: four steppers and two boxes, each named', () => {
    const onUpdate = renderSet('weight_reps');
    for (const name of ['Decrease kg', 'Increase kg', 'Decrease reps', 'Increase reps']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByRole('spinbutton', { name: 'kg' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'reps' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Increase kg' }));
    expect(onUpdate).toHaveBeenCalledWith('weight', '62.5');
  });
  test.each([['time', 'sec'], ['distance', 'm']])('%s: named in its own unit', (unit, what) => {
    renderSet(unit);
    expect(screen.getByRole('button', { name: `Increase ${what}` })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: what })).toBeTruthy();
  });
});
