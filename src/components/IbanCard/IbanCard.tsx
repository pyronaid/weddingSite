import { compactIban, formatIban } from '../../lib/format';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useMessages } from '../../i18n';
import { homeMessages } from '../../pages/homeMessages';
import styles from './IbanCard.module.css';

interface IbanCardProps {
  accountHolder: string;
  iban: string;
  /** Optional details: hidden when empty. */
  bic?: string;
  bankName?: string;
  paymentReason?: string;
}

export function IbanCard({ accountHolder, iban, bic, bankName, paymentReason }: IbanCardProps) {
  const { status, copy } = useCopyToClipboard();
  const t = useMessages(homeMessages).gift;

  const buttonLabel = status === 'copied' ? t.copied : status === 'error' ? t.copyFailed : t.copy;

  return (
    <div className={styles.box}>
      <dl className={styles.list}>
        <div>
          <dt>{t.accountHolder}</dt>
          <dd>{accountHolder}</dd>
        </div>
        <div>
          <dt>{t.iban}</dt>
          <dd className={styles.iban}>{formatIban(iban)}</dd>
        </div>
        {bic && (
          <div>
            <dt>{t.bic}</dt>
            <dd>{bic}</dd>
          </div>
        )}
        {bankName && (
          <div>
            <dt>{t.bank}</dt>
            <dd>{bankName}</dd>
          </div>
        )}
        {paymentReason && (
          <div>
            <dt>{t.paymentReason}</dt>
            <dd>{paymentReason}</dd>
          </div>
        )}
      </dl>

      <button type="button" className={styles.button} onClick={() => void copy(compactIban(iban))}>
        {buttonLabel}
      </button>
      <span role="status" className="visually-hidden">
        {status === 'copied' ? t.copiedAnnouncement : ''}
      </span>
    </div>
  );
}
