import PocketBase from 'pocketbase';
import { PocketBaseAuthService } from './pocketbaseAuthService';

/** Unsigned JWT with a future expiry: enough for the SDK's client-side isValid check. */
function fakeToken(): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp, type: 'auth' })}.signature`;
}

const record = { id: 'u1', collectionId: 'c', collectionName: 'users', email: 'anna@example.com', name: 'Anna', verified: true };

describe('PocketBaseAuthService', () => {
  let pb: PocketBase;

  beforeEach(() => {
    localStorage.clear();
    pb = new PocketBase('http://pocketbase.test');
  });

  it('returns a stable snapshot between changes (required by useSyncExternalStore)', () => {
    pb.authStore.save(fakeToken(), record);
    const service = new PocketBaseAuthService(pb);
    expect(service.getCurrentUser()).toEqual({ id: 'u1', email: 'anna@example.com', name: 'Anna', verified: true });
    expect(service.getCurrentUser()).toBe(service.getCurrentUser());
  });

  it('notifies subscribers on login and logout', () => {
    const service = new PocketBaseAuthService(pb);
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    pb.authStore.save(fakeToken(), record);
    expect(service.getCurrentUser()?.id).toBe('u1');

    service.logout();
    expect(service.getCurrentUser()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    pb.authStore.save(fakeToken(), record);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores an expired stored session', () => {
    pb.authStore.save('not-a-jwt', record);
    expect(new PocketBaseAuthService(pb).getCurrentUser()).toBeNull();
  });
});
