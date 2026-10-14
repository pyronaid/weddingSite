import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { createAuthService, type AuthService } from '../../services/auth';
import { AuthContext } from './useAuth';

// One service per page load: it owns the PocketBase auth store subscription.
let defaultService: AuthService | undefined;
const getDefaultService = () => (defaultService ??= createAuthService());

interface AuthProviderProps {
  children: ReactNode;
  /** Injected in tests; defaults to the PocketBase-backed service. */
  service?: AuthService;
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  const auth = service ?? getDefaultService();
  const user = useSyncExternalStore(auth.subscribe, auth.getCurrentUser, auth.getCurrentUser);

  // The stored token may have been revoked (password changed, user deleted):
  // validate it once with the server when the private area is opened.
  useEffect(() => {
    void auth.refresh();
  }, [auth]);

  const value = useMemo(() => ({ user, auth }), [user, auth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
