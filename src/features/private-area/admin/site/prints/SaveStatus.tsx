import formStyles from '../../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import styles from './prints.module.css';
import type { SaveStatus as Status } from './useSavedDesign';

/** "Saving…", "Saved ✓", or why it was not saved, with a way to try again. */
export function SaveStatus({ status, error, onRetry }: { status: Status; error: string | null; onRetry: () => void }) {
  const t = useMessages(printMessages).saving;
  return (
    <p role="status" className={`${styles.saveStatus} ${status === 'error' ? styles.warning : ''}`}>
      {status === 'error' ? t.error(error ?? '') : t[status]}
      {status === 'error' && (
        <>
          {' '}
          <button type="button" className={formStyles.textButton} onClick={onRetry}>
            {t.retry}
          </button>
        </>
      )}
    </p>
  );
}
