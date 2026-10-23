import { messagesOf } from '../../i18n';
import { authServiceMessages } from './messages';
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

/** Messages in the site language, read when the error is built. */
const texts = () => messagesOf(authServiceMessages);

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
  if (!isPocketBaseError(error)) return new AuthError('unknown', texts().errors.unknown, {}, { cause: error });

  const make = (code: AuthErrorCode, fieldErrors: Record<string, string> = {}) =>
    new AuthError(code, texts().errors[code], fieldErrors, { cause: error });

  if (error.status === 0) return make('network');
  if (error.status === 429) return make('rate_limited');

  if (operation === 'login') {
    if (error.status === 403) return make('email_not_verified');
    if (error.status === 400) return make('invalid_credentials');
  }

  const data = error.response?.data ?? {};
  const fieldErrors = Object.fromEntries(
    Object.entries(data).map(([field, detail]) => [field, detail?.message ?? texts().invalidValue]),
  );

  if (operation === 'token' && (error.status === 400 || error.status === 404)) {
    // A password validation error is not an invalid token.
    const onlyTokenErrors = Object.keys(fieldErrors).every((key) => key === 'token');
    if (onlyTokenErrors) return make('invalid_token');
  }

  if (error.status === 400 && Object.keys(fieldErrors).length > 0) {
    if (fieldErrors.email && data.email?.code === 'validation_not_unique') {
      fieldErrors.email = texts().emailTaken;
    }
    return make('validation', fieldErrors);
  }

  return make('unknown');
}

export function notConfiguredError(): AuthError {
  return new AuthError('not_configured', texts().errors.not_configured);
}
