import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { SUITS } from '../../../services/game';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { useGameProgress } from '../game/useGameProgress';
import { AdminDashboard } from '../admin/AdminDashboard';
import { useMessages } from '../../../i18n';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

/** Landing page of the private area: game intro and progress per suit. */
export function DashboardPage() {
  const { user } = useAuth();
  // Organisers get their own home: what to edit in each suit.
  return user?.isAdmin ? <AdminDashboard /> : <PlayerDashboard />;
}

function PlayerDashboard() {
  const t = useMessages(authMessages);
  useDocumentTitle(t.privateArea);
  const { user, auth } = useAuth();
  const firstName = user?.name.split(' ')[0] || t.dashboard.friend;
  const game = useGameProgress();
  const progress = game.status === 'success' ? game.data : undefined;

  return (
    <div className={styles.stack}>
      <CardHeader id="dashboard-title" eyebrow={t.privateArea} title={t.dashboard.hello(firstName)} />
      <p className={styles.center}>
        {t.dashboard.intro}
      </p>

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

      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        {t.dashboard.logOut}
      </button>
      <div className={styles.links}>
        <Link to="/">{t.dashboard.backToSite}</Link>
      </div>
    </div>
  );
}
