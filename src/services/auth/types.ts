import { SUITS, type Suit } from '../game/types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  /**
   * The suits this user organises (edits in the organisers' area), granted by
   * a superuser, never self-assigned. Organisers play the game like everybody.
   */
  adminSuits: Suit[];
  /** Super admin: edits every suit, the site content, the language and the sign-up code. */
  isSuperAdmin: boolean;
}

/** The suits the user may edit: theirs, or every suit for a super admin. */
export function editableSuits(user: AuthUser | null): Suit[] {
  if (!user) return [];
  return user.isSuperAdmin ? [...SUITS] : user.adminSuits;
}

export const canEditSuit = (user: AuthUser | null, suit: Suit) => editableSuits(user).includes(suit);

/** Organises at least one suit (or is a super admin). */
export const isOrganiser = (user: AuthUser | null) => editableSuits(user).length > 0;

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  /** Code given to the guests: required to create an account (checked by the server). */
  secretCode: string;
}

/**
 * Backend-agnostic authentication contract. Pages depend only on this, so the
 * PocketBase implementation can be replaced (or mocked in tests) freely.
 */
export interface AuthService {
  /** Current user snapshot. Must return a stable reference between changes. */
  getCurrentUser(): AuthUser | null;
  /** Subscribes to session changes; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;

  login(email: string, password: string): Promise<AuthUser>;
  logout(): void;
  /** Re-validates the stored session with the server; clears it if invalid. */
  refresh(): Promise<void>;

  signUp(input: SignUpInput): Promise<void>;
  requestVerification(email: string): Promise<void>;
  confirmVerification(token: string): Promise<void>;

  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, password: string, passwordConfirm: string): Promise<void>;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'validation'
  | 'invalid_token'
  | 'rate_limited'
  | 'network'
  | 'not_configured'
  | 'unknown';

/** Normalised error so the UI never parses backend-specific payloads. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  /** Per-field messages returned by the server (keys use the form field names). */
  readonly fieldErrors: Record<string, string>;

  constructor(code: AuthErrorCode, message: string, fieldErrors: Record<string, string> = {}, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
