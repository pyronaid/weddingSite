import PocketBase from 'pocketbase';
import { PocketBaseGameRepository } from './pocketbaseGameRepository';
import { GameError } from './types';

/** Unsigned JWT with a future expiry: enough for the SDK's client-side isValid check. */
function fakeToken(): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp, type: 'auth' })}.signature`;
}

const user = { id: 'u1', collectionId: 'c', collectionName: 'users', email: 'anna@example.com' };

const page = (items: object[]) =>
  new Response(JSON.stringify({ page: 1, perPage: 1000, totalItems: items.length, totalPages: 1, items }), {
    headers: { 'Content-Type': 'application/json' },
  });

const deck = ['hearts', 'diamonds', 'spades', 'clubs'].flatMap((suit) => Array.from({ length: 13 }, () => ({ suit })));
const owned = (suit: string) => ({ expand: { card: { suit } } });

describe('PocketBaseGameRepository', () => {
  let pb: PocketBase;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    pb = new PocketBase('http://pocketbase.test');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts collected and total cards per suit', async () => {
    pb.authStore.save(fakeToken(), user);
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/collections/cards/')
        ? page(deck)
        : page([owned('hearts'), owned('hearts'), owned('clubs'), owned('unknown-suit'), {}]),
    );

    await expect(new PocketBaseGameRepository(pb).getProgress()).resolves.toEqual({
      hearts: { collected: 2, total: 13 },
      diamonds: { collected: 0, total: 13 },
      spades: { collected: 0, total: 13 },
      clubs: { collected: 1, total: 13 },
    });

    const collectedUrl = new URL(fetchMock.mock.calls.map(([url]) => String(url)).find((u) => u.includes('collected_cards'))!);
    expect(collectedUrl.searchParams.get('filter')).toBe('user = "u1"');
    expect(collectedUrl.searchParams.get('expand')).toBe('card');
  });

  it('fails without calling the server when nobody is logged in', async () => {
    await expect(new PocketBaseGameRepository(pb).getProgress()).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps network and auth failures to GameError codes', async () => {
    pb.authStore.save(fakeToken(), user);
    const repository = new PocketBaseGameRepository(pb);

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(repository.getProgress()).rejects.toMatchObject({ code: 'network' });

    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status: 401, message: 'x', data: {} }), { status: 401 }));
    const error = await repository.getProgress().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameError);
    expect(error).toMatchObject({ code: 'unauthenticated' });
  });
});
