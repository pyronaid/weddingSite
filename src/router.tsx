import { createBrowserRouter, Navigate } from 'react-router';
import { HomePage } from './pages/HomePage';

// The private area is code-split: guests visiting the public page never
// download its JavaScript. All pages share one chunk (./pages/index.ts).
const pages = () => import('./features/private-area/pages');

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/area',
    lazy: async () => ({ Component: (await import('./features/private-area/PrivateAreaRoot')).PrivateAreaRoot }),
    children: [
      {
        lazy: async () => ({ Component: (await import('./features/private-area/guards')).RequireAuth }),
        children: [{ index: true, lazy: async () => ({ Component: (await pages()).DashboardPage }) }],
      },
      {
        lazy: async () => ({ Component: (await import('./features/private-area/guards')).GuestOnly }),
        children: [
          { path: 'login', lazy: async () => ({ Component: (await pages()).LoginPage }) },
          { path: 'signup', lazy: async () => ({ Component: (await pages()).SignupPage }) },
          { path: 'forgot-password', lazy: async () => ({ Component: (await pages()).ForgotPasswordPage }) },
        ],
      },
      // Reachable from e-mail links whether or not the user is logged in.
      { path: 'reset-password', lazy: async () => ({ Component: (await pages()).ResetPasswordPage }) },
      { path: 'verify-email', lazy: async () => ({ Component: (await pages()).VerifyEmailPage }) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
