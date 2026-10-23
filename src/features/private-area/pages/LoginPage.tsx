import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { PasswordField, TextField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { validateLogin, type FieldErrors } from '../../../services/auth';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import type { RedirectState } from '../guards';
import { ResendVerification } from './ResendVerification';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

export function LoginPage() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.logIn);
  const { auth } = useAuth();
  const notice = (useLocation().state as RedirectState | null)?.notice;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const { submitting, error, run } = useFormSubmit();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // On success the <GuestOnly> guard redirects to the private area.
    await run(async () => {
      await auth.login(email.trim().toLowerCase(), password);
    });
  };

  return (
    <>
      <CardHeader id="login-title" eyebrow={t.privateArea} title={t.login.title} />
      <p className={styles.intro}>{t.login.intro}</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="login-title">
        {notice && !error && <p className={`${formStyles.notice} ${formStyles.noticeSuccess}`}>{notice}</p>}

        <TextField
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />
        <PasswordField
          label={t.password}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />
        <div className={styles.inlineRight}>
          <Link to="/area/forgot-password">{t.login.forgot}</Link>
        </div>

        {error && (
          <div className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
            {error.code === 'email_not_verified' && <ResendVerification email={email.trim().toLowerCase()} />}
          </div>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? t.login.submitting : t.logIn}
        </button>
      </form>

      <div className={styles.links}>
        <span>
          {t.login.newHere} <Link to="/area/signup">{t.login.createAccount}</Link>
        </span>
      </div>
    </>
  );
}
