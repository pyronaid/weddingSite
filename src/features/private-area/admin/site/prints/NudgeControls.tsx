import formStyles from '../../../../../components/Form/Form.module.css';
import styles from './prints.module.css';

/** Something moved in whole steps and resized in percent. */
export interface Nudge {
  x: number;
  y: number;
  size: number;
}

export interface NudgeLimits {
  maxSteps: number;
  sizeStep: number;
  minSize: number;
  maxSize: number;
}

/** The texts, given what is moved ("the first letter", "the top-left decoration"). */
export interface NudgeLabels {
  group: (which: string) => string;
  bigger: (which: string) => string;
  smaller: (which: string) => string;
  up: (which: string) => string;
  down: (which: string) => string;
  left: (which: string) => string;
  right: (which: string) => string;
  reset: string;
  resetLabel: (which: string) => string;
}

interface NudgeControlsProps {
  /** What is moved, for the labels. */
  which: string;
  value: Nudge;
  limits: NudgeLimits;
  labels: NudgeLabels;
  /** Asks for a change (the caller may refuse it). */
  onChange: (next: Nudge) => void;
}

const NEUTRAL: Nudge = { x: 0, y: 0, size: 100 };

/**
 * Six buttons to move something and change its size:
 *   [+] [^] [-]
 *   [<] [v] [>]
 * and a reset once it has been moved. Each button is disabled at its limit.
 */
export function NudgeControls({ which, value, limits, labels, onChange }: NudgeControlsProps) {
  const { x, y, size } = value;
  const move = (dx: number, dy: number) => onChange({ ...value, x: x + dx, y: y + dy });
  const resize = (step: number) => onChange({ ...value, size: size + step * limits.sizeStep });
  const buttons = [
    { symbol: '+', label: labels.bigger(which), action: () => resize(1), disabled: size >= limits.maxSize },
    { symbol: '▲', label: labels.up(which), action: () => move(0, -1), disabled: y <= -limits.maxSteps },
    { symbol: '−', label: labels.smaller(which), action: () => resize(-1), disabled: size <= limits.minSize },
    { symbol: '◀', label: labels.left(which), action: () => move(-1, 0), disabled: x <= -limits.maxSteps },
    { symbol: '▼', label: labels.down(which), action: () => move(0, 1), disabled: y >= limits.maxSteps },
    { symbol: '▶', label: labels.right(which), action: () => move(1, 0), disabled: x >= limits.maxSteps },
  ];
  const moved = x !== 0 || y !== 0 || size !== 100;

  return (
    <div className={styles.adjust} role="group" aria-label={labels.group(which)}>
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
          aria-label={labels.resetLabel(which)}
          onClick={() => onChange(NEUTRAL)}
        >
          {labels.reset}
        </button>
      )}
    </div>
  );
}
