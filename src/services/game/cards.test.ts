import { buildPhrase, isFaceCard, normalizeAnswer, rankName } from './cards';
import type { PlayingCard } from './types';

const clubs = (collected: Record<number, string | null> = {}): PlayingCard[] =>
  Array.from({ length: 13 }, (_, i) => {
    const rank = i + 1;
    const isCollected = rank in collected;
    return { id: `c${rank}`, suit: 'clubs', rank, collected: isCollected, letter: isCollected ? collected[rank] : null };
  });

describe('buildPhrase', () => {
  it('shows a dash for every numbered card not collected yet', () => {
    expect(buildPhrase(clubs())).toBe('----------');
  });

  it('puts each collected letter at the position of its rank', () => {
    expect(buildPhrase(clubs({ 6: 'A' }))).toBe('-----A----');
    expect(buildPhrase(clubs({ 1: 'W', 6: 'A', 10: 'N' }))).toBe('W----A---N');
  });

  it('ignores face cards and the input order', () => {
    const shuffled = clubs({ 2: 'E', 12: 'X', 13: null }).reverse();
    expect(buildPhrase(shuffled)).toBe('-E--------');
  });

  it('keeps a dash when a collected card has no letter configured', () => {
    expect(buildPhrase(clubs({ 3: null }))).toBe('----------');
  });
});

describe('card helpers', () => {
  it('names ranks and detects face cards', () => {
    expect([1, 7, 11, 12, 13].map(rankName)).toEqual(['Ace', '7', 'Jack', 'Queen', 'King']);
    expect([10, 11, 13].map(isFaceCard)).toEqual([false, true, true]);
  });
});

describe('normalizeAnswer', () => {
  it('keeps letters and digits only, uppercase', () => {
    expect(normalizeAnswer(' a p-p.le 2 ')).toBe('APPLE2');
  });

  it('folds accents and drops apostrophes, as names are typed in the boxes', () => {
    expect(normalizeAnswer('Nicolò')).toBe('NICOLO');
    expect(normalizeAnswer("D'Amico")).toBe('DAMICO');
    expect(normalizeAnswer('Èlia Società')).toBe('ELIASOCIETA');
  });
});
