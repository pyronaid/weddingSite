import { AuthError, type AuthErrorCode } from './types';

/** Minimal structural type of the PocketBase SDK ClientResponseError. */
interface PocketBaseErrorLike {
  status: number;
  response?: { message?: string; data?: Record<string, { code?: string; message?: string }> };
  isAbort?: boolean;
}

function isPocketBaseError(error: unknown): error is PocketBaseErrorLike {
  return typeof error === 'object' && error !== null && typeof (error as PocketBaseErrorLike).status === 'number';
}

const MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Invalid e-mail or password.',
  email_not_verified: 'Please confirm your e-mail address before logging in.',
  validation: 'Please check the highlighted fields.',
  invalid_token: 'This link is invalid or has expired. Please request a new one.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  network: 'Unable to reach the server. Check your connection and try again.',
  not_configured: 'The private area is not available yet.',
  unknown: 'Something went wrong. Please try again.',
};

export type AuthOperation = 'login' | 'signup' | 'token' | 'generic';

/**
 * Maps a PocketBase error to an AuthError.
 * Status codes (PocketBase >= 0.23):
 *   400 -> failed login / validation / bad token
 *   403 -> authenticated but the collection authRule failed (= not verified)
 *   429 -> rate limited, 0 -> network error / aborted
 */
export function toAuthError(error: unknown, operation: AuthOperation = 'generic'): AuthError {
  if (error instanceof AuthError) return error;
  if (!isPocketBaseError(error)) return new AuthError('unknown', MESSAGES.unknown, {}, { cause: error });

  const make = (code: AuthErrorCode, fieldErrors: Record<string, string> = {}) =>
    new AuthError(code, MESSAGES[code], fieldErrors, { cause: error });

  if (error.status === 0) return make('network');
  if (error.status === 429) return make('rate_limited');

  if (operation === 'login') {
    if (error.status === 403) return make('email_not_verified');
    if (error.status === 400) return make('invalid_credentials');
  }

  const data = error.response?.data ?? {};
  const fieldErrors = Object.fromEntries(
    Object.entries(data).map(([field, detail]) => [field, detail?.message ?? 'Invalid value.']),
  );

  if (operation === 'token' && (error.status === 400 || error.status === 404)) {
    // A password validation error is not an invalid token.
    const onlyTokenErrors = Object.keys(fieldErrors).every((key) => key === 'token');
    if (onlyTokenErrors) return make('invalid_token');
  }

  if (error.status === 400 && Object.keys(fieldErrors).length > 0) {
    if (fieldErrors.email && data.email?.code === 'validation_not_unique') {
      fieldErrors.email = 'An account with this e-mail already exists.';
    }
    return make('validation', fieldErrors);
  }

  return make('unknown');
}

export function notConfiguredError(): AuthError {
  return new AuthError('not_configured', MESSAGES.not_configured);
}
