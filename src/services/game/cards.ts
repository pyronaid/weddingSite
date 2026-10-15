import type { PlayingCard, Rank, Suit } from './types';

const RANK_NAMES: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };

/** Jack, Queen and King: they show a star instead of a letter. */
export const isFaceCard = (rank: Rank) => rank >= 11;

export const rankName = (rank: Rank) => RANK_NAMES[rank] ?? String(rank);

/** Path of the front image in /public/cards. */
export const cardImageUrl = (suit: Suit, rank: Rank) => `/cards/${suit}/${rank}.svg`;

export const MISSING_LETTER = '-';

/**
 * The secret phrase of a suit: one character per numbered card (Ace..10) in
 * rank order, its letter when collected, a dash otherwise. E.g. "-----A----".
 */
export function buildPhrase(cards: readonly PlayingCard[]): string {
  return cards
    .filter((card) => !isFaceCard(card.rank))
    .toSorted((a, b) => a.rank - b.rank)
    .map((card) => (card.collected && card.letter ? card.letter : MISSING_LETTER))
    .join('');
}

/** Letters and digits only, uppercase: the format of riddle answers. */
export function normalizeAnswer(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Adds the file token to a protected file URL. */
export function signFileUrl(url: string, token: string): string {
  const signed = new URL(url, window.location.href);
  signed.searchParams.set('token', token);
  return signed.toString();
}
