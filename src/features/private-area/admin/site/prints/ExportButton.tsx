import formStyles from '../../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';

interface ExportButtonProps {
  label: string;
  /** What it exports, for screen readers ("PNG: Invitation"). */
  item: string;
  id: string;
  /** The export running now, if any: one at a time. */
  busy: string | null;
  disabled?: boolean;
  onClick: () => void;
}

export function ExportButton({ label, item, id, busy, disabled, onClick }: ExportButtonProps) {
  const t = useMessages(printMessages);
  return (
    <button
      type="button"
      className={formStyles.textButton}
      disabled={disabled || busy !== null}
      aria-label={t.downloadLabel(label, item)}
      onClick={onClick}
    >
      {busy === id ? '…' : label}
    </button>
  );
}
