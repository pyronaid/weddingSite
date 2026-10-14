import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { PasswordField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { PASSWORD_MIN_LENGTH, validateNewPassword, type FieldErrors } from '../../../services/auth';
import { useAuth } from '../useAuth';
import { LOGIN_PATH, type RedirectState } from '../guards';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

type Field = 'password' | 'passwordConfirm';

/** Target of the link in the "reset password" e-mail: /area/reset-password?token=... */
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const { auth } = useAuth();
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const { submitting, error, run } = useFormSubmit();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateNewPassword(password, passwordConfirm);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const ok = await run(() => auth.confirmPasswordReset(token, password, passwordConfirm));
    if (ok) {
      navigate(LOGIN_PATH, {
        replace: true,
        state: { notice: 'Your password has been updated. You can now log in.' } satisfies RedirectState,
      });
    }
  };

  if (!token || error?.code === 'invalid_token') {
    return (
      <div className={styles.stack}>
        <CardHeader id="reset-invalid-title" eyebrow="Password reset" title="Link expired" />
        <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
          This reset link is invalid or has expired. Reset links can be used only once.
        </p>
        <Link to="/area/forgot-password" className={formStyles.secondary}>
          Request a new link
        </Link>
      </div>
    );
  }

  const serverErrors = (error?.code === 'validation' ? error.fieldErrors : {}) as FieldErrors<Field>;

  return (
    <>
      <CardHeader id="reset-title" eyebrow="Private area" title="Reset password" />
      <p className={styles.intro}>Choose a new password for your account.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="reset-title">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password ?? serverErrors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          required
        />
        <PasswordField
          label="Confirm new password"
          name="passwordConfirm"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          error={fieldErrors.passwordConfirm ?? serverErrors.passwordConfirm}
          required
        />

        {error && error.code !== 'validation' && (
          <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
          </p>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </>
  );
}
