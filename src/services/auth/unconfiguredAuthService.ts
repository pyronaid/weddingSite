import { notConfiguredError } from './errors';
import type { AuthService } from './types';

/** Used when no PocketBase URL is configured: every action fails gracefully. */
export class UnconfiguredAuthService implements AuthService {
  getCurrentUser = () => null;
  subscribe = () => () => {};
  logout(): void {}
  async refresh(): Promise<void> {}

  private fail(): never {
    throw notConfiguredError();
  }

  async login(): Promise<never> {
    return this.fail();
  }
  async signUp(): Promise<void> {
    this.fail();
  }
  async requestVerification(): Promise<void> {
    this.fail();
  }
  async confirmVerification(): Promise<void> {
    this.fail();
  }
  async requestPasswordReset(): Promise<void> {
    this.fail();
  }
  async confirmPasswordReset(): Promise<void> {
    this.fail();
  }
}
