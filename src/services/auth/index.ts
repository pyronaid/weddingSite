import { getPocketBase } from '../../lib/pocketbase';
import { PocketBaseAuthService } from './pocketbaseAuthService';
import type { AuthService } from './types';
import { UnconfiguredAuthService } from './unconfiguredAuthService';

export * from './types';
export * from './validation';

export function createAuthService(): AuthService {
  const pb = getPocketBase();
  return pb ? new PocketBaseAuthService(pb) : new UnconfiguredAuthService();
}
