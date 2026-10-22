import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { PasswordField, TextField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { PASSWORD_MIN_LENGTH, validateSignUp, type FieldErrors, type SignUpInput } from '../../../services/auth';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import { ResendVerification } from './ResendVerification';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

type Field = keyof SignUpInput;
const EMPTY: SignUpInput = { name: '', email: '', password: '', passwordConfirm: '', secretCode: '' };

export function SignupPage() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.signup.documentTitle);
  const { auth } = useAuth();
  const [values, setValues] = useState<SignUpInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { submitting, error, run } = useFormSubmit();

  const update = (field: Field) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      secretCode: values.secretCode.trim(),
    };
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
        <CardHeader id="signup-done-title" eyebrow={t.signup.almostThere} title={t.checkInbox} />
        <p className={styles.center}>
          {t.signup.sentTo} <strong>{sentTo}</strong>
          {t.signup.sentAfter}
        </p>
        <p className={`${formStyles.notice} ${styles.center}`}>
          {t.signup.spam}
          <ResendVerification email={sentTo} startCoolingDown />
        </p>
        <Link to="/area/login" className={formStyles.secondary}>
          {t.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <>
      <CardHeader id="signup-title" eyebrow={t.privateArea} title={t.signup.title} />
      <p className={styles.intro}>{t.signup.intro}</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="signup-title">
        <TextField
          label={t.signup.fullName}
          name="name"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          onChange={update('name')}
          error={errorFor('name')}
          required
        />
        <TextField
          label={t.email}
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
          label={t.password}
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errorFor('password')}
          hint={t.passwordHint(PASSWORD_MIN_LENGTH)}
          required
        />
        <PasswordField
          label={t.signup.confirmPassword}
          name="passwordConfirm"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={update('passwordConfirm')}
          error={errorFor('passwordConfirm')}
          required
        />
        <TextField
          label={t.signup.secretCode}
          name="secretCode"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={50}
          value={values.secretCode}
          onChange={update('secretCode')}
          error={errorFor('secretCode')}
          hint={t.signup.secretCodeHint}
          required
        />

        {error && (
          <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
          </p>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? t.signup.submitting : t.signup.submit}
        </button>
      </form>

      <div className={styles.links}>
        <span>
          {t.signup.haveAccount} <Link to="/area/login">{t.logIn}</Link>
        </span>
      </div>
    </>
  );
}
