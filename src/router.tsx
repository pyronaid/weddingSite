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
        // Every content page of the private area goes here: anonymous visitors
        // are sent to the login page and brought back after logging in.
        lazy: async () => ({ Component: (await import('./features/private-area/guards')).RequireAuth }),
        children: [
          { index: true, lazy: async () => ({ Component: (await pages()).DashboardPage }) },
          { path: 'suits/:suit', lazy: async () => ({ Component: (await pages()).SuitPage }) },
          // Opened from the QR codes on the card posters.
          { path: 'riddles/:code', lazy: async () => ({ Component: (await pages()).RiddlePage }) },
          { path: 'gallery', lazy: async () => ({ Component: (await pages()).GalleryPage }) },
        ],
      },
      {
        // The organisers of that suit only (admin_suits, set by a superuser), and super admins.
        lazy: async () => ({ Component: (await import('./features/private-area/guards')).RequireSuitAdmin }),
        children: [{ path: 'admin/suits/:suit', lazy: async () => ({ Component: (await pages()).AdminSuitPage }) }],
      },
      {
        // Super admins only (users flagged is_superadmin by a superuser).
        lazy: async () => ({ Component: (await import('./features/private-area/guards')).RequireSuperAdmin }),
        children: [{ path: 'site', lazy: async () => ({ Component: (await pages()).SiteSettingsPage }) }],
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
