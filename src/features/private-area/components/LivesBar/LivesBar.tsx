import type { QuizStatus } from '../../../../services/game';
import styles from './LivesBar.module.css';

const DIAMOND = '♦︎';

/** The quiz lives (3 diamonds) and, once they are over, the penalties. */
export function LivesBar({ status }: { status?: QuizStatus }) {
  if (!status) return null;
  const { lives, maxLives, penalties } = status;
  const summary = `${lives} of ${maxLives} lives left${penalties > 0 ? `, ${penalties} ${penalties === 1 ? 'penalty' : 'penalties'}` : ''}`;

  return (
    <section className={styles.bar} aria-label="Your lives">
      <p className="visually-hidden" role="status">
        {summary}
      </p>
      <div className={styles.row} aria-hidden="true">
        <span className={styles.label}>Lives</span>
        {Array.from({ length: maxLives }, (_, index) => (
          <span key={index} className={index < lives ? styles.life : styles.lost}>
            {DIAMOND}
          </span>
        ))}
      </div>
      {penalties > 0 && (
        <div className={styles.row} aria-hidden="true">
          <span className={styles.label}>Penalties</span>
          {Array.from({ length: Math.min(penalties, 10) }, (_, index) => (
            <span key={index} className={styles.penalty}>
              {DIAMOND}
            </span>
          ))}
          {penalties > 10 && <span className={styles.more}>×{penalties}</span>}
        </div>
      )}
    </section>
  );
}
