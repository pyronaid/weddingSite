import { Link } from 'react-router';
import type { Suit, SuitProgress } from '../../../../services/game';
import { SUIT_META, suitPath } from '../../game/suits';
import styles from './SuitCard.module.css';

interface SuitCardProps {
  suit: Suit;
  /** Undefined while loading or when the progress could not be loaded. */
  progress?: SuitProgress;
}

/** A playing-card shaped link to a suit page, showing the collected count. */
export function SuitCard({ suit, progress }: SuitCardProps) {
  const { label, symbol, colour } = SUIT_META[suit];
  const complete = progress !== undefined && progress.total > 0 && progress.collected >= progress.total;
  const percent = progress && progress.total > 0 ? Math.min(100, (progress.collected / progress.total) * 100) : 0;
  const description = progress ? `${progress.collected} of ${progress.total} cards collected` : 'progress not available';

  return (
    <Link
      to={suitPath(suit)}
      className={`${styles.card} ${styles[colour]} ${complete ? styles.complete : ''}`}
      aria-label={`${label}: ${description}`}
    >
      <span className={styles.corner} aria-hidden="true">
        {symbol}
      </span>
      <span className={styles.symbol} aria-hidden="true">
        {symbol}
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.counter}>
        {progress ? `${progress.collected}/${progress.total}` : '–/–'}
      </span>
      <span className={styles.bar} aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span className={`${styles.corner} ${styles.cornerBottom}`} aria-hidden="true">
        {symbol}
      </span>
    </Link>
  );
}
