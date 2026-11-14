import { useId } from 'react';
import formStyles from '../../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import styles from './prints.module.css';

const isLocalAddress = (url: string) => /\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);

/** The address the QR codes open, with a warning when phones could not reach it. */
export function WebsiteField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
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
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id={`${id}-hint`} className={formStyles.hint}>
        {isLocalAddress(url) ? <strong className={styles.warning}>{t.localhost}</strong> : t.websiteHint}
      </span>
    </div>
  );
}
