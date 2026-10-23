import { messagesOf } from '../../i18n';
import { cardMessages } from './messages';
import type { PlayingCard, Rank, Suit } from './types';

/** Jack, Queen and King: they show a star instead of a letter. */
export const isFaceCard = (rank: Rank) => rank >= 11;

/**
 * Suits whose numbered cards hide a secret letter (and so a secret phrase).
 * The spades are a "guess who" game instead: no letters, a star on every
 * collected card.
 */
export const hasLetters = (suit: Suit) => suit !== 'spades';

/** "Ace", "6", "King" (in the site language). */
export const rankName = (rank: Rank) => messagesOf(cardMessages).ranks[rank] ?? String(rank);

/** "Hearts" (in the site language). */
export const suitName = (suit: Suit) => messagesOf(cardMessages).suits[suit];

/** "6 of spades" / "6 di picche". */
export const cardName = (rank: Rank, suit: Suit) => messagesOf(cardMessages).card(rankName(rank), suitName(suit));

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

/**
 * Letters and digits only, uppercase, accents folded ("Nicolò" -> "NICOLO"):
 * the format of riddle answers and of the "guess who" names.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Adds the file token to a protected file URL. */
export function signFileUrl(url: string, token: string): string {
  const signed = new URL(url, window.location.href);
  signed.searchParams.set('token', token);
  return signed.toString();
}
