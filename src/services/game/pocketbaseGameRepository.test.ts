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

  it('lists the cards of a suit with the collected state and revealed letters', async () => {
    pb.authStore.save(fakeToken(), user);
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/collections/cards/')
        ? page([
            { id: 'a', rank: 1 },
            { id: 'b', rank: 6, letter: 'A' },
            { id: 'c', rank: 13, letter: '' },
          ])
        : page([{ card: 'b' }, { card: 'c' }]),
    );

    await expect(new PocketBaseGameRepository(pb).getSuitCards('clubs')).resolves.toEqual([
      { id: 'a', suit: 'clubs', rank: 1, collected: false, letter: null },
      { id: 'b', suit: 'clubs', rank: 6, collected: true, letter: 'A' },
      { id: 'c', suit: 'clubs', rank: 13, collected: true, letter: null },
    ]);

    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    const cardsUrl = urls.find((u) => u.pathname.includes('/collections/cards/'))!;
    expect(cardsUrl.searchParams.get('filter')).toBe('suit = "clubs"');
    expect(cardsUrl.searchParams.get('sort')).toBe('rank');
    const collectedUrl = urls.find((u) => u.pathname.includes('collected_cards'))!;
    expect(collectedUrl.searchParams.get('filter')).toBe('user = "u1" && card.suit = "clubs"');
  });

  it('loads a riddle and submits answers through the custom endpoints', async () => {
    pb.authStore.save(fakeToken(), user);
    const json = (body: object, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json({ correct: true, collected: true, letter: 'G' })
        : json({ suit: 'clubs', rank: 7, riddle: 'Lorem', length: 5, collected: false, letter: '' }),
    );
    const repository = new PocketBaseGameRepository(pb);

    await expect(repository.getRiddle('abc123xyz789')).resolves.toEqual({
      suit: 'clubs',
      rank: 7,
      text: 'Lorem',
      length: 5,
      collected: false,
      letter: null,
    });
    await expect(repository.solveRiddle('abc123xyz789', 'APPLE')).resolves.toEqual({
      correct: true,
      collected: true,
      letter: 'G',
    });

    const [getCall, postCall] = fetchMock.mock.calls;
    expect(String(getCall[0])).toBe('http://pocketbase.test/api/game/riddles/abc123xyz789');
    expect(String(postCall[0])).toBe('http://pocketbase.test/api/game/riddles/abc123xyz789/solve');
    expect(JSON.parse(String(postCall[1].body))).toEqual({ answer: 'APPLE' });

    fetchMock.mockImplementation(async () => json({ status: 404, message: 'Riddle not found.', data: {} }, 404));
    await expect(repository.getRiddle('unknown123')).rejects.toMatchObject({ code: 'not_found' });
  });
});
