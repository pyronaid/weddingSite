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
  /** Spades only: the "guess who" person was found. */
  found?: boolean;
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

/** The scene drawn for a photo challenge card (hearts). */
export interface PhotoDraw {
  /** The user's submission for this card: the photo is uploaded to it. */
  submissionId: string;
  scene: string;
  /** A photo was already uploaded: the scene no longer changes. */
  locked: boolean;
  /** The current photo (thumbnail, already signed with a file token), if any. */
  photoUrl: string | null;
}

/** A photo of the shared gallery. */
export interface GalleryPhoto {
  id: string;
  suit: Suit;
  rank: Rank;
  scene: string;
  player: string;
  /** Small version for the grid (protected: add a file token, see signFileUrl). */
  thumbUrl: string;
  /** Larger version for the enlarged view (protected). */
  largeUrl: string;
  /** Last change (ISO-like string, sortable): newest first. */
  updated: string;
}

/** Permission to load protected photos, valid until `expiresAt` (ms since epoch). */
export interface FileToken {
  token: string;
  expiresAt: number;
}

export interface GalleryPage {
  items: GalleryPhoto[];
  hasMore: boolean;
}

/** Lives and penalties of the quiz, shared by all the diamonds cards. */
export interface QuizStatus {
  lives: number;
  maxLives: number;
  penalties: number;
}

export interface QuizQuestion {
  questionId: string;
  /**
   * Jack, Queen and King: the question is asked in person. `text` is empty,
   * the answers are just letters (A, B, C...) and `number` tells the person
   * which of the card's questions to ask.
   */
  inPerson?: boolean;
  number?: number;
  text: string;
  /** The choices; which one is correct stays on the server. */
  answers: { id: string; text: string }[];
}

/** The player's current question for a card, or the card already won. */
export type QuizDraw =
  | { solved: true; letter: string | null; status: QuizStatus }
  | { solved: false; question: QuizQuestion; status: QuizStatus };

export type QuizAnswerResult =
  | { correct: true; letter: string | null; status: QuizStatus }
  /** Wrong (or answered an outdated question, `stale`): here is the next question. */
  | { correct: false; stale: boolean; question: QuizQuestion; status: QuizStatus };

/** A hint of the "guess who" game (spades), revealed by the card of that rank. */
export interface GuessHint {
  rank: Rank;
  text: string;
}

export interface SelfiePhoto {
  /** Protected: already signed with a file token. */
  url: string;
  /** The card the photo was taken for (an earlier one, when confirmed as the same person). */
  takenFor: Rank;
}

/** A spades card as the player sees it: locked until the previous card has its selfie. */
export type GuessCard =
  | { locked: true; rank: Rank }
  | {
      locked: false;
      rank: Rank;
      /** From the Ace up to this card, in order. */
      hints: GuessHint[];
      /** Sent for this card (it is then collected); `reused`: the previous selfie was confirmed. */
      selfie: (SelfiePhoto & { reused: boolean }) | null;
      /** Without a selfie yet: the previous card's, to confirm "same person as before". */
      previous: SelfiePhoto | null;
    };

export interface GuessStatus {
  /** The person was drawn (the Ace was opened). */
  assigned: boolean;
  /** Every spades card has its selfie: the final guess is open. */
  complete: boolean;
  found: boolean;
  /** Who it was, once found. */
  name: string | null;
  /** Letters of the name and surname (one box each), while guessing. */
  lengths: { firstName: number; lastName: number } | null;
}

export interface GuessResult {
  correct: boolean;
  name: string | null;
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
  /** Draws a random scene for a card, or returns the locked one once a photo exists. */
  drawPhotoScene(cardId: string): Promise<PhotoDraw>;
  /** Uploads (or replaces) the photo of a drawn scene; this collects the card. */
  uploadPhoto(submissionId: string, photo: Blob): Promise<void>;
  /** One page of the gallery, newest first (pages start at 1). */
  getGallery(page: number, perPage: number): Promise<GalleryPage>;
  /** Photos added or replaced after `since` (an `updated` value), newest first. */
  getGalleryUpdates(since: string): Promise<GalleryPhoto[]>;
  /** A token to load protected photos; cached until close to expiry unless `force`. */
  getFileToken(options?: { force?: boolean }): Promise<FileToken>;
  /** Lives left and penalties of the quiz. */
  getQuizStatus(): Promise<QuizStatus>;
  /** The current question of a diamonds card: drawn once, kept until answered. */
  getQuizQuestion(cardId: string): Promise<QuizDraw>;
  /** Answers the current question: right collects the card, wrong costs a life (or a penalty). */
  answerQuiz(cardId: string, questionId: string, answerId: string): Promise<QuizAnswerResult>;
  /** Where the player stands in the "guess who" game. */
  getGuessStatus(): Promise<GuessStatus>;
  /** The hints of a spades card (opening the Ace draws the person to find). */
  getGuessCard(cardId: string): Promise<GuessCard>;
  /** Sends the selfie of a spades card, which collects it. */
  uploadSelfie(cardId: string, photo: Blob): Promise<GuessCard>;
  /** "Same person as before": the previous card's selfie counts for this one too. */
  confirmPreviousSelfie(cardId: string): Promise<GuessCard>;
  /** The final guess, once all the spades are collected. */
  solveGuess(firstName: string, lastName: string): Promise<GuessResult>;
}

export type GameErrorCode =
  | 'unauthenticated'
  | 'not_found'
  | 'invalid_photo'
  /** The server refused the action (e.g. a locked card): its message is shown. */
  | 'rejected'
  | 'network'
  | 'not_configured'
  | 'unknown';

/** Normalised error so the UI never parses backend-specific payloads. */
export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GameError';
    this.code = code;
  }
}
