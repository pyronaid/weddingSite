import type { Rank, Suit } from '../game';

export interface AdminScene {
  id: string;
  text: string;
}

/** A card as the organisers edit it (hidden fields included). */
export interface AdminCard {
  id: string;
  suit: Suit;
  rank: Rank;
  /** Secret letter (Ace..10; empty for face cards). */
  letter: string;
  /** Clubs only. */
  riddle?: string;
  /** Clubs only: letters/digits, stored uppercase. */
  solution?: string;
  /** Numbered hearts only: the bucket of scenes drawn by the photo challenge. */
  scenes?: AdminScene[];
}

export interface AdminCardChanges {
  letter?: string;
  riddle?: string;
  solution?: string;
}

export interface AdminSettings {
  /** Code required to create an account. */
  signupCode: string;
}

/** Organisers' operations; every one is checked by the server (is_admin). */
export interface AdminRepository {
  getSuit(suit: Suit): Promise<AdminCard[]>;
  updateCard(cardId: string, changes: AdminCardChanges): Promise<AdminCard>;
  addScene(cardId: string, text: string): Promise<AdminScene>;
  updateScene(sceneId: string, text: string): Promise<AdminScene>;
  deleteScene(sceneId: string): Promise<void>;
  getSettings(): Promise<AdminSettings>;
  updateSettings(settings: AdminSettings): Promise<AdminSettings>;
}

export type AdminErrorCode =
  | 'validation'
  | 'forbidden'
  | 'unauthenticated'
  | 'not_found'
  | 'network'
  | 'not_configured'
  | 'unknown';

export class AdminError extends Error {
  readonly code: AdminErrorCode;
  /** Per-field messages from the server, keyed by field name. */
  readonly fieldErrors: Record<string, string>;

  constructor(code: AdminErrorCode, message: string, fieldErrors: Record<string, string> = {}, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AdminError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
