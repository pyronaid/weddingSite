import type { Rank, Suit } from '../game';

export interface AdminScene {
  id: string;
  text: string;
}

export interface AdminAnswer {
  id: string;
  text: string;
  correct: boolean;
}

export interface AdminQuestion {
  id: string;
  text: string;
  answers: AdminAnswer[];
}

export interface NewQuestion {
  text: string;
  /** At least two, exactly one correct. */
  answers: { text: string; correct: boolean }[];
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
  /** Diamonds only: the quiz questions with their answers. */
  questions?: AdminQuestion[];
}

export interface AdminCardChanges {
  letter?: string;
  riddle?: string;
  solution?: string;
}

/** A person of the "guess who" game (spades). */
export interface PersonFields {
  firstName: string;
  lastName: string;
  /** 13 hints, one per card: index 0 is the Ace's, 12 the King's. */
  hints: string[];
}

export interface AdminPerson extends PersonFields {
  id: string;
  /** Players given this person, and how many of them found it. */
  assigned: number;
  found: number;
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
  addQuestion(cardId: string, question: NewQuestion): Promise<AdminQuestion>;
  updateQuestion(questionId: string, text: string): Promise<AdminQuestion>;
  deleteQuestion(questionId: string): Promise<void>;
  /** Answer operations return the whole question, as the correct mark may move. */
  addAnswer(questionId: string, answer: { text: string; correct?: boolean }): Promise<AdminQuestion>;
  updateAnswer(answerId: string, changes: { text?: string; correct?: true }): Promise<AdminQuestion>;
  deleteAnswer(answerId: string): Promise<AdminQuestion>;
  getPeople(): Promise<AdminPerson[]>;
  addPerson(person: PersonFields): Promise<AdminPerson>;
  updatePerson(personId: string, person: PersonFields): Promise<AdminPerson>;
  /** Refused once the person was given to a player. */
  deletePerson(personId: string): Promise<void>;
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
