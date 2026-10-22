import { useState } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { useCooldown } from '../../../hooks/useCooldown';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';

const COOLDOWN_SECONDS = 60;

interface ResendVerificationProps {
  email: string;
  /** Start in cooldown, e.g. right after the sign-up e-mail was sent. */
  startCoolingDown?: boolean;
}

export function ResendVerification({ email, startCoolingDown = false }: ResendVerificationProps) {
  const { auth } = useAuth();
  const t = useMessages(authMessages).resend;
  const { remaining, isCoolingDown, start } = useCooldown(COOLDOWN_SECONDS, startCoolingDown);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const resend = async () => {
    setStatus('sending');
    try {
      await auth.requestVerification(email);
      setStatus('sent');
      start();
    } catch {
      setStatus('error');
    }
  };

  return (
    <p role="status">
      {status === 'sent' && t.sent}
      {status === 'error' && t.failed}
      <button
        type="button"
        className={formStyles.textButton}
        onClick={resend}
        disabled={isCoolingDown || status === 'sending'}
      >
        {isCoolingDown ? t.resendIn(remaining) : t.resend}
      </button>
    </p>
  );
}
