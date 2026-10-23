import { messagesOf } from '../../i18n';
import { adminErrorMessages } from './messages';
import { AdminError, type AdminErrorCode } from './types';

/** Read at call time: in the current site language. */
const message = (code: AdminErrorCode) => messagesOf(adminErrorMessages).errors[code];

interface PocketBaseErrorLike {
  status?: number;
  response?: { message?: string; data?: Record<string, { message?: string }> };
}

export function adminError(code: AdminErrorCode, text = message(code)): AdminError {
  return new AdminError(code, text);
}

/** Maps a PocketBase SDK error to an AdminError with per-field messages. */
export function toAdminError(error: unknown): AdminError {
  if (error instanceof AdminError) return error;
  const { status, response } = (typeof error === 'object' && error !== null ? error : {}) as PocketBaseErrorLike;
  const make = (code: AdminErrorCode, text = message(code), fields: Record<string, string> = {}) =>
    new AdminError(code, text, fields, { cause: error });

  if (status === 0) return make('network');
  if (status === 401) return make('unauthenticated');
  if (status === 403) return make('forbidden');
  if (status === 404) return make('not_found');
  if (status === 400) {
    const fields = Object.fromEntries(
      Object.entries(response?.data ?? {}).map(([field, detail]) => [field, detail?.message ?? messagesOf(adminErrorMessages).invalidValue]),
    );
    // Rule violations come without fields but with a clear server message.
    const validation = message('validation');
    return make('validation', Object.keys(fields).length > 0 ? validation : (response?.message ?? validation), fields);
  }
  return make('unknown');
}
