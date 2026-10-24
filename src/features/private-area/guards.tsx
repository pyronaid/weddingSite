import { Navigate, Outlet, useLocation, useParams, type Location } from 'react-router';
import { canEditSuit } from '../../services/auth';
import { isSuit } from '../../services/game';
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

/**
 * Only for the organisers of the suit in the URL (`:suit`), or super admins;
 * everybody else goes back to the area home. The server checks it too.
 */
export function RequireSuitAdmin() {
  const { user } = useAuth();
  const { suit } = useParams();
  const location = useLocation();
  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location } satisfies RedirectState} />;
  if (!isSuit(suit) || !canEditSuit(user, suit)) return <Navigate to={AREA_HOME} replace />;
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
