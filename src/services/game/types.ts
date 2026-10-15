/** The four suits of the deck. Values match the `cards.suit` select field in PocketBase. */
export const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];

export function isSuit(value: unknown): value is Suit {
  return typeof value === 'string' && (SUITS as readonly string[]).includes(value);
}

export interface SuitProgress {
  /** Cards of this suit the current user has collected. */
  collected: number;
  /** Cards of this suit in the deck. */
  total: number;
}

export type GameProgress = Record<Suit, SuitProgress>;

/** 1 = Ace, 2..10, 11 = Jack, 12 = Queen, 13 = King. */
export type Rank = number;

export interface PlayingCard {
  id: string;
  suit: Suit;
  rank: Rank;
  collected: boolean;
  /** Secret letter: only sent by the server for collected cards. */
  letter: string | null;
}

/** A riddle, reached from the QR code printed on a card poster. */
export interface Riddle {
  suit: Suit;
  rank: Rank;
  text: string;
  /** Number of letters/digits in the solution: one input box each. */
  length: number;
  collected: boolean;
  /** The card's secret letter, once collected. */
  letter: string | null;
}

export interface RiddleAttempt {
  correct: boolean;
  collected: boolean;
  letter: string | null;
}

/**
 * Backend-agnostic access to the card game. Pages depend only on this, so the
 * PocketBase implementation can be replaced (or faked in tests) freely.
 */
export interface GameRepository {
  /** Collected/total cards per suit for the logged-in user. */
  getProgress(): Promise<GameProgress>;
  /** Every card of a suit, sorted by rank, with the user's collected state. */
  getSuitCards(suit: Suit): Promise<PlayingCard[]>;
  /** The riddle behind a QR code (fails with `not_found` if unknown or not ready). */
  getRiddle(code: string): Promise<Riddle>;
  /** Checks an answer on the server; a correct one collects the card. */
  solveRiddle(code: string, answer: string): Promise<RiddleAttempt>;
}

export type GameErrorCode = 'unauthenticated' | 'not_found' | 'network' | 'not_configured' | 'unknown';

/** Normalised error so the UI never parses backend-specific payloads. */
export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GameError';
    this.code = code;
  }
}
