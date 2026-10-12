import { compactIban, formatIban } from '../../lib/format';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import styles from './IbanCard.module.css';

interface IbanCardProps {
  accountHolder: string;
  iban: string;
  bic?: string;
  bankName?: string;
  paymentReason?: string;
}

export function IbanCard({ accountHolder, iban, bic, bankName, paymentReason }: IbanCardProps) {
  const { status, copy } = useCopyToClipboard();

  const buttonLabel = status === 'copied' ? 'Copied!' : status === 'error' ? 'Copy failed' : 'Copy IBAN';

  return (
    <div className={styles.box}>
      <dl className={styles.list}>
        <div>
          <dt>Account holder</dt>
          <dd>{accountHolder}</dd>
        </div>
        <div>
          <dt>IBAN</dt>
          <dd className={styles.iban}>{formatIban(iban)}</dd>
        </div>
        {bic && (
          <div>
            <dt>BIC / SWIFT</dt>
            <dd>{bic}</dd>
          </div>
        )}
        {bankName && (
          <div>
            <dt>Bank</dt>
            <dd>{bankName}</dd>
          </div>
        )}
        {paymentReason && (
          <div>
            <dt>Payment reason</dt>
            <dd>{paymentReason}</dd>
          </div>
        )}
      </dl>

      <button type="button" className={styles.button} onClick={() => void copy(compactIban(iban))}>
        {buttonLabel}
      </button>
      <span role="status" className="visually-hidden">
        {status === 'copied' ? 'IBAN copied to clipboard' : ''}
      </span>
    </div>
  );
}
