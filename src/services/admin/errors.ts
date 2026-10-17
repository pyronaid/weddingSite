import { AdminError, type AdminErrorCode } from './types';

const MESSAGES: Record<AdminErrorCode, string> = {
  validation: 'Please check the highlighted values.',
  forbidden: 'Only the organisers can do this.',
  unauthenticated: 'Your session has expired. Please log in again.',
  not_found: 'This item no longer exists: reload the page.',
  network: 'Unable to reach the server. Check your connection and try again.',
  not_configured: 'The admin area is not available yet.',
  unknown: 'Something went wrong. Please try again.',
};

interface PocketBaseErrorLike {
  status?: number;
  response?: { message?: string; data?: Record<string, { message?: string }> };
}

export function adminError(code: AdminErrorCode, message = MESSAGES[code]): AdminError {
  return new AdminError(code, message);
}

/** Maps a PocketBase SDK error to an AdminError with per-field messages. */
export function toAdminError(error: unknown): AdminError {
  if (error instanceof AdminError) return error;
  const { status, response } = (typeof error === 'object' && error !== null ? error : {}) as PocketBaseErrorLike;
  const make = (code: AdminErrorCode, message = MESSAGES[code], fields: Record<string, string> = {}) =>
    new AdminError(code, message, fields, { cause: error });

  if (status === 0) return make('network');
  if (status === 401) return make('unauthenticated');
  if (status === 403) return make('forbidden');
  if (status === 404) return make('not_found');
  if (status === 400) {
    const fields = Object.fromEntries(
      Object.entries(response?.data ?? {}).map(([field, detail]) => [field, detail?.message ?? 'Invalid value.']),
    );
    // Rule violations come without fields but with a clear server message.
    return make('validation', Object.keys(fields).length > 0 ? MESSAGES.validation : (response?.message ?? MESSAGES.validation), fields);
  }
  return make('unknown');
}
