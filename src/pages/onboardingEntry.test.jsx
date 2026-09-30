// @vitest-environment jsdom
//
// B35: the first two minutes of a stranger's visit. A coach tapping "Start free" on the
// landing page, and a client tapping their coach's invite link, are both people without an
// account — they must land on "Create Account", not "Sign In". And the invite a coach
// shares from the Clients page must carry the link, not only the code.
//
// Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ThemeProvider } = await import('../context/ThemeContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: LandingPage } = await import('./LandingPage');
const { default: LoginPage } = await import('./LoginPage');
const { default: ClientsPage } = await import('./ClientsPage');
const { inviteUrl, opensAsSignUp } = await import('../utils/inviteLink');

const signedOut = {
  currentUser: null, setLanguage: vi.fn(),
  signInWithGoogle: vi.fn(), signUpEmail: vi.fn(), signInEmail: vi.fn(), sendPasswordReset: vi.fn(),
  googleAuthError: null, clearGoogleAuthError: vi.fn(),
};

function renderAt(path, element, app = signedOut) {
  return render(
    <AppContext.Provider value={app}>
      <ThemeProvider><LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider></ThemeProvider>
    </AppContext.Provider>,
  );
}

const submitLabel = () => screen.getByRole('button', { name: /^(Create Account|Sign In)$/ }).textContent.trim();

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('arriving to create an account opens the sign-up form', () => {
  test('"Start free" on the landing page → Create Account', async () => {
    renderAt('/landing');
    fireEvent.click(screen.getAllByText(/Start free/)[0]);
    await waitFor(() => expect(submitLabel()).toBe('Create Account'));
  });

  test('a coach\'s invite link → Create Account', () => {
    sessionStorage.setItem('elitepro_invite_code', 'ANI123'); // what App.jsx stores from ?invite=
    renderAt('/login', null);
    expect(submitLabel()).toBe('Create Account');
  });

  test('someone coming back to sign in still gets Sign In', () => {
    renderAt('/login', null);
    expect(submitLabel()).toBe('Sign In');
  });

  test('opensAsSignUp: unreadable storage (private mode) is not fatal', () => {
    const broken = { getItem: () => { throw new Error('denied'); } };
    expect(opensAsSignUp('', broken)).toBe(false);
    expect(opensAsSignUp('?signup=1', broken)).toBe(true);
  });
});

describe('sharing the invite from the Clients page', () => {
  const coach = { id: 'coach-1', name: 'Ani', role: 'trainer', inviteCode: 'ANI123' };
  const app = {
    currentUser: coach, setLanguage: vi.fn(),
    getClients: () => [], getBodyStats: () => [], getInviteCode: vi.fn(async () => 'ANI123'),
  };

  test('the share sheet gets the link that opens sign-up with the code filled in', async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    renderAt('/clients', <ClientsPage />, app);
    fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].url).toBe('https://elitepro-16718.web.app/#/?invite=ANI123');
    expect(share.mock.calls[0][0].text).toContain('ANI123');
    delete navigator.share;
  });

  test('without a share sheet, the copied message includes the link', async () => {
    const copied = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (s) => { copied.push(s); } } });
    renderAt('/clients', <ClientsPage />, app);
    fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
    await waitFor(() => expect(copied).toHaveLength(1));
    expect(copied[0]).toContain(inviteUrl('ANI123'));
    delete navigator.share;
  });
});
