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

/**
 * Backend-agnostic access to the card game. Pages depend only on this, so the
 * PocketBase implementation can be replaced (or faked in tests) freely.
 */
export interface GameRepository {
  /** Collected/total cards per suit for the logged-in user. */
  getProgress(): Promise<GameProgress>;
}

export type GameErrorCode = 'unauthenticated' | 'network' | 'not_configured' | 'unknown';

/** Normalised error so the UI never parses backend-specific payloads. */
export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GameError';
    this.code = code;
  }
}
