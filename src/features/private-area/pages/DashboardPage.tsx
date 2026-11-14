import formStyles from '../../../components/Form/Form.module.css';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { SUITS } from '../../../services/game';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { useGameProgress } from '../game/useGameProgress';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { AreaLayout } from './AreaLayout';
import styles from './pages.module.css';

/**
 * Landing page of the private area: game intro and progress per suit, for
 * everybody. Organisers play too: this is their "My game" tab.
 */
export function DashboardPage() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.privateArea);
  const game = useGameProgress();
  const progress = game.status === 'success' ? game.data : undefined;

  return (
    <AreaLayout current="game">
      <p className={styles.center}>{t.dashboard.intro}</p>

      <section aria-labelledby="collection-title" aria-busy={game.status === 'loading'}>
        <h3 id="collection-title" className={styles.sectionTitle}>
          {t.dashboard.collection}
        </h3>

        {game.status === 'error' && (
          <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError} ${styles.sectionNotice}`}>
            {game.error.message}{' '}
            {game.error.code !== 'not_configured' && (
              <button type="button" className={formStyles.textButton} onClick={game.retry}>
                {t.dashboard.tryAgain}
              </button>
            )}
          </div>
        )}

        <div className={styles.suitGrid}>
          {SUITS.map((suit) => (
            <SuitCard key={suit} suit={suit} progress={progress?.[suit]} />
          ))}
        </div>
      </section>
    </AreaLayout>
  );
}
