import { Link } from 'react-router';
import type { Suit, SuitProgress } from '../../../../services/game';
import { SUIT_META, suitPath } from '../../game/suits';
import styles from './SuitCard.module.css';

interface SuitCardProps {
  suit: Suit;
  /** Undefined while loading or when the progress could not be loaded. */
  progress?: SuitProgress;
  /** Admin variant: link target and caption instead of the progress. */
  to?: string;
  caption?: string;
}

/** A playing-card shaped link to a suit page, showing the collected count. */
export function SuitCard({ suit, progress, to, caption }: SuitCardProps) {
  const { label, symbol, colour } = SUIT_META[suit];
  // Spades are complete only once the "guess who" person is found too.
  const complete =
    progress !== undefined && progress.total > 0 && progress.collected >= progress.total && progress.found !== false;
  const percent = progress && progress.total > 0 ? Math.min(100, (progress.collected / progress.total) * 100) : 0;
  const found = progress?.found === undefined ? '' : progress.found ? 'person found' : 'person not found yet';
  const description =
    caption ??
    (progress
      ? `${progress.collected} of ${progress.total} cards collected${found ? `, ${found}` : ''}`
      : 'progress not available');

  return (
    <Link
      to={to ?? suitPath(suit)}
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
      {caption ? (
        <span className={styles.caption}>{caption}</span>
      ) : (
        <>
          <span className={styles.counter}>{progress ? `${progress.collected}/${progress.total}` : '–/–'}</span>
          <span className={styles.bar} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
          {progress?.found !== undefined && (
            <span className={`${styles.found} ${progress.found ? styles.foundYes : ''}`} aria-hidden="true">
              {progress.found ? 'Person found ✓' : 'Person not found'}
            </span>
          )}
        </>
      )}
      <span className={`${styles.corner} ${styles.cornerBottom}`} aria-hidden="true">
        {symbol}
      </span>
    </Link>
  );
}
