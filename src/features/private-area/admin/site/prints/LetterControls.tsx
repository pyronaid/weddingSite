import formStyles from '../../../../../components/Form/Form.module.css';
import { ADJUST, NO_ADJUSTMENT, type LetterAdjustment } from '../../../../../brand/monogram';
import { useMessages } from '../../../../../i18n';
import { printMessages } from '../../../messages/prints';
import styles from './prints.module.css';

interface LetterControlsProps {
  letter: 0 | 1;
  adjustment: LetterAdjustment;
  /** Asks for a change: the designer applies it only if the letter stays inside the area. */
  onAdjust: (next: LetterAdjustment) => void;
}

/**
 * Six buttons to move a letter and change its size, in the logo:
 *   [+] [^] [-]
 *   [<] [v] [>]
 * (and a reset once moved). The limits of each step are those of ADJUST.
 */
export function LetterControls({ letter, adjustment, onAdjust }: LetterControlsProps) {
  const t = useMessages(printMessages).logo.adjust;
  const which = t.which[letter];
  const { x, y, size } = adjustment;
  const move = (dx: number, dy: number) => onAdjust({ ...adjustment, x: x + dx, y: y + dy });
  const resize = (step: number) => onAdjust({ ...adjustment, size: size + step * ADJUST.sizeStep });
  const buttons = [
    { symbol: '+', label: t.bigger(which), action: () => resize(1), disabled: size >= ADJUST.maxSize },
    { symbol: '▲', label: t.up(which), action: () => move(0, -1), disabled: y <= -ADJUST.maxSteps },
    { symbol: '−', label: t.smaller(which), action: () => resize(-1), disabled: size <= ADJUST.minSize },
    { symbol: '◀', label: t.left(which), action: () => move(-1, 0), disabled: x <= -ADJUST.maxSteps },
    { symbol: '▼', label: t.down(which), action: () => move(0, 1), disabled: y >= ADJUST.maxSteps },
    { symbol: '▶', label: t.right(which), action: () => move(1, 0), disabled: x >= ADJUST.maxSteps },
  ];
  const moved = x !== 0 || y !== 0 || size !== 100;

  return (
    <div className={styles.adjust} role="group" aria-label={t.group(which)}>
      <div className={styles.adjustGrid}>
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            className={styles.adjustButton}
            aria-label={button.label}
            title={button.label}
            disabled={button.disabled}
            onClick={button.action}
          >
            <span aria-hidden="true">{button.symbol}</span>
          </button>
        ))}
      </div>
      {moved && (
        <button
          type="button"
          className={`${formStyles.textButton} ${styles.adjustReset}`}
          aria-label={t.resetLabel(which)}
          onClick={() => onAdjust(NO_ADJUSTMENT)}
        >
          {t.reset}
        </button>
      )}
    </div>
  );
}
