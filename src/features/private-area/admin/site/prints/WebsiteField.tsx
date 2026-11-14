import { useId } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import styles from './prints.module.css';

const isLocalAddress = (url: string) => /\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);

/** The address the QR codes open, with a warning when phones could not reach it. */
export function WebsiteField({
  value,
  onChange,
  onReset,
  disabled,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Shown when another address was typed: back to the site's own. */
  onReset?: () => void;
  disabled?: boolean;
  /** Why the address could not be saved. */
  error: string | null;
}) {
  const t = useMessages(printMessages);
  const id = useId();
  const url = value.trim();
  return (
    <div className={formStyles.field}>
      <label htmlFor={id}>{t.website}</label>
      <input
        id={id}
        type="url"
        value={value}
        inputMode="url"
        spellCheck={false}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id={`${id}-hint`} className={formStyles.hint}>
        {isLocalAddress(url) ? <strong className={styles.warning}>{t.localhost}</strong> : t.websiteHint}
      </span>
      {error && (
        <span role="alert" className={styles.warning}>
          {t.saving.error(error)}
        </span>
      )}
      {onReset && (
        <button type="button" className={`${formStyles.textButton} ${styles.resetText}`} onClick={onReset}>
          {t.sameSite}
        </button>
      )}
    </div>
  );
}
