import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { AuthError, type AuthService, type AuthUser } from '../../services/auth';
import { AuthProvider } from './AuthProvider';
import { GuestOnly, RequireAuth } from './guards';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

/** In-memory AuthService: lets us drive the UI without a backend. */
function createFakeAuth(overrides: Partial<AuthService> = {}) {
  let user: AuthUser | null = null;
  const listeners = new Set<() => void>();
  const setUser = (next: AuthUser | null) => {
    user = next;
    listeners.forEach((l) => l());
  };
  const service: AuthService = {
    getCurrentUser: () => user,
    subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    login: vi.fn(async (email: string) => {
      const next = { id: '1', email, name: 'Anna Verdi', verified: true };
      setUser(next);
      return next;
    }),
    logout: vi.fn(() => setUser(null)),
    refresh: vi.fn(async () => {}),
    signUp: vi.fn(async () => {}),
    requestVerification: vi.fn(async () => {}),
    confirmVerification: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => {}),
    confirmPasswordReset: vi.fn(async () => {}),
    ...overrides,
  };
  return service;
}

function renderArea(service: AuthService, initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/area',
        // Stand-in for PrivateAreaRoot: same provider, no animations/photos.
        element: (
          <AuthProvider service={service}>
            <Outlet />
          </AuthProvider>
        ),
        children: [
          { element: <RequireAuth />, children: [{ index: true, element: <DashboardPage /> }] },
          { element: <GuestOnly />, children: [{ path: 'login', element: <LoginPage /> }] },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

async function fillAndSubmit(email = 'anna@example.com', password = 'password123') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^e-mail$/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole('button', { name: /^log in$/i }));
  return user;
}

describe('private area', () => {
  it('sends anonymous visitors to the login page, then back after logging in', async () => {
    const auth = createFakeAuth();
    const router = renderArea(auth, '/area');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    await fillAndSubmit();

    expect(await screen.findByRole('heading', { name: /hello, anna/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/area');
    expect(auth.login).toHaveBeenCalledWith('anna@example.com', 'password123');
  });

  it('validates the form locally before calling the backend', async () => {
    const auth = createFakeAuth();
    renderArea(auth, '/area/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: /^log in$/i }));
    expect(screen.getByText(/please enter your e-mail/i)).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('offers to resend the confirmation e-mail when the account is not verified', async () => {
    const auth = createFakeAuth({
      login: vi.fn().mockRejectedValue(new AuthError('email_not_verified', 'Please confirm your e-mail address.')),
    });
    renderArea(auth, '/area/login');
    await screen.findByRole('heading', { name: /welcome back/i });
    const user = await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/confirm your e-mail/i);
    await user.click(screen.getByRole('button', { name: /resend confirmation/i }));
    expect(auth.requestVerification).toHaveBeenCalledWith('anna@example.com');
    expect(await screen.findByRole('button', { name: /resend e-mail \(60s\)/i })).toBeDisabled();
  });

  it('logs out from the dashboard', async () => {
    const auth = createFakeAuth();
    await auth.login('anna@example.com', 'x');
    renderArea(auth, '/area');
    await userEvent.setup().click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
