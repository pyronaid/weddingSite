import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import type { AuthError } from '../../../services/auth';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

type Status = 'verifying' | 'success' | 'error';

/** Target of the link in the confirmation e-mail: /area/verify-email?token=... */
export function VerifyEmailPage() {
  useDocumentTitle('Confirm e-mail');
  const { auth } = useAuth();
  const token = useSearchParams()[0].get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState('This confirmation link is invalid.');
  // StrictMode runs effects twice in development: confirm each token only once.
  const confirmedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || confirmedToken.current === token) return;
    confirmedToken.current = token;

    auth
      .confirmVerification(token)
      .then(() => setStatus('success'))
      .catch((error: AuthError) => {
        setMessage(error.message);
        setStatus('error');
      });
  }, [auth, token]);

  if (status === 'verifying') {
    return (
      <div className={styles.stack} role="status">
        <CardHeader id="verify-title" eyebrow="Private area" title="Just a moment" />
        <p className={styles.center}>Confirming your e-mail address…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.stack}>
        <span className={styles.icon} aria-hidden="true">
          💌
        </span>
        <CardHeader id="verify-title" eyebrow="All set" title="E-mail confirmed" />
        <p className={styles.center} role="status">
          Thank you! Your account is now active.
        </p>
        <Link to="/area/login" className={formStyles.submit}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <CardHeader id="verify-title" eyebrow="Private area" title="Link not valid" />
      <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
        {message} If you already confirmed your e-mail, simply log in. Otherwise, try to log in to receive a new
        confirmation e-mail.
      </p>
      <Link to="/area/login" className={formStyles.secondary}>
        Go to login
      </Link>
    </div>
  );
}
