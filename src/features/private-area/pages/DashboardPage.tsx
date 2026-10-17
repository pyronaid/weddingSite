import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { SUITS } from '../../../services/game';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { useGameProgress } from '../game/useGameProgress';
import { AdminDashboard } from '../admin/AdminDashboard';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

/** Landing page of the private area: game intro and progress per suit. */
export function DashboardPage() {
  const { user } = useAuth();
  // Organisers get their own home: what to edit in each suit.
  return user?.isAdmin ? <AdminDashboard /> : <PlayerDashboard />;
}

function PlayerDashboard() {
  useDocumentTitle('Private area');
  const { user, auth } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'friend';
  const game = useGameProgress();
  const progress = game.status === 'success' ? game.data : undefined;

  return (
    <div className={styles.stack}>
      <CardHeader id="dashboard-title" eyebrow="Private area" title={`Hello, ${firstName}!`} />
      <p className={styles.center}>
        Here you can find the most interactive part of the wedding. Challenge the other attendees and collect all
        the info to find the joker and win the prize.
      </p>

      <section aria-labelledby="collection-title" aria-busy={game.status === 'loading'}>
        <h3 id="collection-title" className={styles.sectionTitle}>
          Your collection
        </h3>

        {game.status === 'error' && (
          <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError} ${styles.sectionNotice}`}>
            {game.error.message}{' '}
            {game.error.code !== 'not_configured' && (
              <button type="button" className={formStyles.textButton} onClick={game.retry}>
                Try again
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

      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        Log out
      </button>
      <div className={styles.links}>
        <Link to="/">Back to the wedding site</Link>
      </div>
    </div>
  );
}
