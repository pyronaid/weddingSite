import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { PasswordField, TextField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { PASSWORD_MIN_LENGTH, validateSignUp, type FieldErrors, type SignUpInput } from '../../../services/auth';
import { useAuth } from '../useAuth';
import { ResendVerification } from './ResendVerification';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

type Field = keyof SignUpInput;
const EMPTY: SignUpInput = { name: '', email: '', password: '', passwordConfirm: '' };

export function SignupPage() {
  useDocumentTitle('Create an account');
  const { auth } = useAuth();
  const [values, setValues] = useState<SignUpInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { submitting, error, run } = useFormSubmit();

  const update = (field: Field) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() };
    const errors = validateSignUp(input);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const ok = await run(() => auth.signUp(input));
    if (ok) setSentTo(input.email);
  };

  // Server-side field errors (e.g. e-mail already used) are merged with local ones.
  const serverErrors = (error?.code === 'validation' ? error.fieldErrors : {}) as FieldErrors<Field>;
  const errorFor = (field: Field) => fieldErrors[field] ?? serverErrors[field];

  if (sentTo) {
    return (
      <div className={styles.stack}>
        <span className={styles.icon} aria-hidden="true">
          ✉️
        </span>
        <CardHeader id="signup-done-title" eyebrow="Almost there" title="Check your inbox" />
        <p className={styles.center}>
          We sent a confirmation link to <strong>{sentTo}</strong>. Click it to activate your account, then come back to
          log in.
        </p>
        <p className={`${formStyles.notice} ${styles.center}`}>
          Can&apos;t find it? Check the spam folder.
          <ResendVerification email={sentTo} startCoolingDown />
        </p>
        <Link to="/area/login" className={formStyles.secondary}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <CardHeader id="signup-title" eyebrow="Private area" title="Join us" />
      <p className={styles.intro}>Create your account to access the reserved content.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="signup-title">
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          onChange={update('name')}
          error={errorFor('name')}
          required
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={update('email')}
          error={errorFor('email')}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errorFor('password')}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          required
        />
        <PasswordField
          label="Confirm password"
          name="passwordConfirm"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={update('passwordConfirm')}
          error={errorFor('passwordConfirm')}
          required
        />

        {error && (
          <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
          </p>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className={styles.links}>
        <span>
          Already have an account? <Link to="/area/login">Log in</Link>
        </span>
      </div>
    </>
  );
}
