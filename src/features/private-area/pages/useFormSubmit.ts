import { useCallback, useRef, useState } from 'react';
import { messagesOf } from '../../../i18n';
import { AuthError } from '../../../services/auth';
import { authServiceMessages } from '../../../services/auth/messages';

/**
 * Small state machine shared by the auth forms:
 * idle -> submitting -> (success | error), with a guard against double submits.
 */
export function useFormSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof AuthError ? err : new AuthError('unknown', messagesOf(authServiceMessages).errors.unknown));
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, setError, run };
}
