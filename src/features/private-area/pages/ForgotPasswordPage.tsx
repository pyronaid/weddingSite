import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { TextField } from '../../../components/Form/TextField';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useCooldown } from '../../../hooks/useCooldown';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { validateEmail } from '../../../services/auth';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';
import { useFormSubmit } from './useFormSubmit';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordPage() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.forgot.documentTitle);
  const { auth } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { submitting, error, run } = useFormSubmit();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const send = async (address: string) => {
    const ok = await run(() => auth.requestPasswordReset(address));
    if (ok) {
      setSentTo(address);
      cooldown.start();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    const validation = validateEmail(normalized);
    setEmailError(validation);
    if (!validation) await send(normalized);
  };

  if (sentTo) {
    return (
      <div className={styles.stack}>
        <span className={styles.icon} aria-hidden="true">
          🔑
        </span>
        <CardHeader id="forgot-done-title" eyebrow={t.forgot.eyebrow} title={t.checkInbox} />
        {/* Same message whether or not the account exists: no account enumeration. */}
        <p className={styles.center} role="status">
          {t.forgot.sentBefore} <strong>{sentTo}</strong>
          {t.forgot.sentAfter}
        </p>
        {error && (
          <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
          </p>
        )}
        <button
          type="button"
          className={formStyles.secondary}
          onClick={() => void send(sentTo)}
          disabled={cooldown.isCoolingDown || submitting}
        >
          {cooldown.isCoolingDown ? t.forgot.sendAgainIn(cooldown.remaining) : t.forgot.sendAgain}
        </button>
        <div className={styles.links}>
          <Link to="/area/login">{t.backToLogin}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <CardHeader id="forgot-title" eyebrow={t.privateArea} title={t.forgot.title} />
      <p className={styles.intro}>{t.forgot.intro}</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-labelledby="forgot-title">
        <TextField
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          required
        />

        {error && (
          <p className={`${formStyles.notice} ${formStyles.noticeError}`} role="alert">
            {error.message}
          </p>
        )}

        <button className={formStyles.submit} type="submit" disabled={submitting}>
          {submitting ? t.forgot.submitting : t.forgot.submit}
        </button>
      </form>

      <div className={styles.links}>
        <Link to="/area/login">{t.backToLogin}</Link>
      </div>
    </>
  );
}
