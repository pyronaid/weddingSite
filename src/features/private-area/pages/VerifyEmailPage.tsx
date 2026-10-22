import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import type { AuthError } from '../../../services/auth';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

type Status = 'verifying' | 'success' | 'error';

/** Target of the link in the confirmation e-mail: /area/verify-email?token=... */
export function VerifyEmailPage() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.verify.documentTitle);
  const { auth } = useAuth();
  const token = useSearchParams()[0].get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(t.verify.invalidLink);
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
        <CardHeader id="verify-title" eyebrow={t.privateArea} title={t.verify.waitTitle} />
        <p className={styles.center}>{t.verify.confirming}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.stack}>
        <span className={styles.icon} aria-hidden="true">
          💌
        </span>
        <CardHeader id="verify-title" eyebrow={t.verify.allSet} title={t.verify.confirmedTitle} />
        <p className={styles.center} role="status">
          {t.verify.active}
        </p>
        <Link to="/area/login" className={formStyles.submit}>
          {t.logIn}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <CardHeader id="verify-title" eyebrow={t.privateArea} title={t.verify.invalidTitle} />
      <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
        {message} {t.verify.invalidHelp}
      </p>
      <Link to="/area/login" className={formStyles.secondary}>
        {t.goToLogin}
      </Link>
    </div>
  );
}
