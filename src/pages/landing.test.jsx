// @vitest-environment jsdom
//
// B50 (Ani 2026-10-17): the landing page follows the visitor's phone language, and the
// English / 繁體中文 toggle switches it for this visit. Firebase is replaced (#38).

import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../context/AppContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: LandingPage } = await import('./LandingPage');
const { useLanguage } = await import('../i18n/LanguageContext');

const setPhoneLanguage = (tag) => Object.defineProperty(window.navigator, 'language', { configurable: true, get: () => tag });

function renderLanding() {
  return render(
    <AppContext.Provider value={{ currentUser: null, setLanguage: vi.fn() }}>
      <LanguageProvider><MemoryRouter><LandingPage /></MemoryRouter></LanguageProvider>
    </AppContext.Provider>,
  );
}

afterEach(() => { cleanup(); });

describe('the landing page speaks the visitor’s language', () => {
  test('a phone in English sees English', () => {
    setPhoneLanguage('en-GB');
    renderLanding();
    expect(screen.getByText('Run your coaching from one app instead of six.')).toBeTruthy();
  });

  test('a phone in Chinese sees Chinese — prices quoted from other companies stay as they wrote them', async () => {
    setPhoneLanguage('zh-HK');
    renderLanding();
    expect(await screen.findByText('用一個 app 管理教練工作，不再在六個 app 之間來回切換。')).toBeTruthy();
    expect(screen.getByText('每月 $23')).toBeTruthy();
    expect(screen.getByText('Trainerize')).toBeTruthy();
    expect(screen.queryByText('Run your coaching from one app instead of six.')).toBeNull();
  });

  test('the toggle switches language for this visit', async () => {
    setPhoneLanguage('en-GB');
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: '繁體中文' }));
    expect(await screen.findByText('首五位教練，免費三個月。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('First five trainers. Three months free.')).toBeTruthy();
  });
});

describe('the choice carries into sign-up (B52)', () => {
  function LoginProbe() { return <p>login page in {useLanguage().lang}</p>; }
  test('Chinese chosen on the landing page is still Chinese on the login page', async () => {
    setPhoneLanguage('en-GB');
    render(
      <AppContext.Provider value={{ currentUser: null, setLanguage: vi.fn() }}>
        <LanguageProvider><MemoryRouter initialEntries={['/']}><Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes></MemoryRouter></LanguageProvider>
      </AppContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '繁體中文' }));
    await screen.findByText('首五位教練，免費三個月。');
    fireEvent.click(screen.getByText('登入'));
    expect(await screen.findByText('login page in zh-HK')).toBeTruthy();
  });
  test('once they sign in, the language they saved takes over', async () => {
    setPhoneLanguage('en-GB');
    function Probe() {
      const { lang, setViewLanguage } = useLanguage();
      return <button onClick={() => setViewLanguage('zh-HK')}>{`now ${lang}`}</button>;
    }
    const tree = (user) => (
      <AppContext.Provider value={{ currentUser: user, setLanguage: vi.fn() }}>
        <LanguageProvider><Probe /></LanguageProvider>
      </AppContext.Provider>
    );
    const { rerender } = render(tree(null));
    fireEvent.click(screen.getByText('now en'));
    expect(await screen.findByText('now zh-HK')).toBeTruthy();
    rerender(tree({ id: 'u1', role: 'client', language: 'en' }));
    expect(await screen.findByText('now en')).toBeTruthy();
  });
});
