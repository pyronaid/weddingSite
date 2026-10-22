export interface AuthUser {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  /** Organiser: sees the admin view (granted by a superuser, never self-assigned). */
  isAdmin: boolean;
  /** Super admin: also edits the site content and language (implies isAdmin). */
  isSuperAdmin: boolean;
}

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
