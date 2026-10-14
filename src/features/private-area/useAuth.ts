import { createContext, useContext } from 'react';
import type { AuthService, AuthUser } from '../../services/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  auth: AuthService;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
