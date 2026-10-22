import { Navigate, Outlet, useLocation, type Location } from 'react-router';
import { useAuth } from './useAuth';

export const AREA_HOME = '/area';
export const LOGIN_PATH = '/area/login';

export interface RedirectState {
  /** Where the user wanted to go before being sent to the login page. */
  from?: Location;
  /** One-off message shown on the destination page (e.g. "password updated"). */
  notice?: string;
}

/** Only for logged-in users; others go to login and come back afterwards. */
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location } satisfies RedirectState} />;
  }
  return <Outlet />;
}

/** Only for organisers (`isAdmin`); other logged-in users go back to the area home. */
export function RequireAdmin() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location } satisfies RedirectState} />;
  if (!user.isAdmin) return <Navigate to={AREA_HOME} replace />;
  return <Outlet />;
}

/** Super admins only (site content and language); others go back to the private area home. */
export function RequireSuperAdmin() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location } satisfies RedirectState} />;
  if (!user.isSuperAdmin) return <Navigate to={AREA_HOME} replace />;
  return <Outlet />;
}

/**
 * Only for anonymous users (login, sign up, forgot password).
 * This is also what redirects after a successful login: the auth store
 * changes, this guard re-renders and sends the user to their destination.
 */
export function GuestOnly() {
  const { user } = useAuth();
  const location = useLocation();
  if (user) {
    const from = (location.state as RedirectState | null)?.from;
    const target = from && from.pathname.startsWith(AREA_HOME) ? from.pathname + from.search : AREA_HOME;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
