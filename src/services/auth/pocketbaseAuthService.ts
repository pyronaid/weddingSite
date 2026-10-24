import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { isSuit } from '../game/types';
import { toAuthError } from './errors';
import type { AuthService, AuthUser, SignUpInput } from './types';

const USERS = 'users';

function toAuthUser(record: RecordModel | null): AuthUser | null {
  if (!record) return null;
  return {
    id: record.id,
    email: String(record.email ?? ''),
    name: String(record.name ?? ''),
    verified: Boolean(record.verified),
    // Unknown values (a suit added on the server first) are ignored.
    adminSuits: (Array.isArray(record.admin_suits) ? record.admin_suits : []).filter(isSuit),
    isSuperAdmin: Boolean(record.is_superadmin),
  };
}

export class PocketBaseAuthService implements AuthService {
  private readonly pb: PocketBase;
  private readonly listeners = new Set<() => void>();
  /**
   * Cached snapshot: `pb.authStore.record` re-parses localStorage and returns
   * a new object on every read, which would break useSyncExternalStore.
   */
  private current: AuthUser | null;

  constructor(pb: PocketBase) {
    this.pb = pb;
    this.current = pb.authStore.isValid ? toAuthUser(pb.authStore.record) : null;

    // Fires on login/logout/refresh, including changes made in other tabs.
    pb.authStore.onChange((_token, record) => {
      this.current = this.pb.authStore.isValid ? toAuthUser(record) : null;
      this.listeners.forEach((listener) => listener());
    });
  }

  getCurrentUser = (): AuthUser | null => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async login(email: string, password: string): Promise<AuthUser> {
    try {
      const { record } = await this.pb.collection(USERS).authWithPassword(email, password);
      return toAuthUser(record)!;
    } catch (error) {
      throw toAuthError(error, 'login');
    }
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  async refresh(): Promise<void> {
    if (!this.pb.authStore.isValid) return;
    try {
      await this.pb.collection(USERS).authRefresh();
    } catch (error) {
      const authError = toAuthError(error);
      // Keep the session on network errors (offline), drop it otherwise.
      if (authError.code !== 'network') this.pb.authStore.clear();
    }
  }

  async signUp({ name, email, password, passwordConfirm, secretCode }: SignUpInput): Promise<void> {
    try {
      // `secretCode` is not a field: pb_hooks/signup.pb.js checks it and it is never stored.
      await this.pb
        .collection(USERS)
        .create({ name, email, password, passwordConfirm, secretCode, emailVisibility: false });
    } catch (error) {
      throw toAuthError(error, 'signup');
    }
    await this.requestVerification(email);
  }

  async requestVerification(email: string): Promise<void> {
    try {
      await this.pb.collection(USERS).requestVerification(email);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async confirmVerification(token: string): Promise<void> {
    try {
      await this.pb.collection(USERS).confirmVerification(token);
    } catch (error) {
      throw toAuthError(error, 'token');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      // PocketBase answers 204 even for unknown e-mails: no account enumeration.
      await this.pb.collection(USERS).requestPasswordReset(email);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async confirmPasswordReset(token: string, password: string, passwordConfirm: string): Promise<void> {
    try {
      await this.pb.collection(USERS).confirmPasswordReset(token, password, passwordConfirm);
    } catch (error) {
      throw toAuthError(error, 'token');
    }
  }
}
