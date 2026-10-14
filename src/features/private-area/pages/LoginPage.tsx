import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { PasswordField, TextField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { validateLogin, type FieldErrors } from '../../../services/auth';
import { useAuth } from '../useAuth';
import type { RedirectState } from '../guards';
import { ResendVerification } from './ResendVerification';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

export function LoginPage() {
  useDocumentTitle('Log in');
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
      <CardHeader id="login-title" eyebrow="Private area" title="Welcome back" />
      <p className={styles.intro}>Log in to access the reserved content.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="login-title">
        {notice && !error && <p className={`${formStyles.notice} ${formStyles.noticeSuccess}`}>{notice}</p>}

        <TextField
          label="E-mail"
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
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />
        <div className={styles.inlineRight}>
          <Link to="/area/forgot-password">Forgot your password?</Link>
        </div>

        {error && (
          <div className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
            {error.code === 'email_not_verified' && <ResendVerification email={email.trim().toLowerCase()} />}
          </div>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className={styles.links}>
        <span>
          New here? <Link to="/area/signup">Create an account</Link>
        </span>
      </div>
    </>
  );
}
