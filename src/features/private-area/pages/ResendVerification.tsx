import { useState } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { useCooldown } from '../../../hooks/useCooldown';
import { useAuth } from '../useAuth';

const COOLDOWN_SECONDS = 60;

interface ResendVerificationProps {
  email: string;
  /** Start in cooldown, e.g. right after the sign-up e-mail was sent. */
  startCoolingDown?: boolean;
}

export function ResendVerification({ email, startCoolingDown = false }: ResendVerificationProps) {
  const { auth } = useAuth();
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
      {status === 'sent' && 'A new confirmation e-mail is on its way. '}
      {status === 'error' && 'We could not send the e-mail, please try again later. '}
      <button
        type="button"
        className={formStyles.textButton}
        onClick={resend}
        disabled={isCoolingDown || status === 'sending'}
      >
        {isCoolingDown ? `Resend e-mail (${remaining}s)` : 'Resend confirmation e-mail'}
      </button>
    </p>
  );
}
