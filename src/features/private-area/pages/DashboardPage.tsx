import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

/** Placeholder landing page of the private area, shown after login. */
export function DashboardPage() {
  useDocumentTitle('Private area');
  const { user, auth } = useAuth();
  const firstName = user?.name.split(' ')[0] || 'friend';

  return (
    <div className={styles.stack}>
      <CardHeader id="dashboard-title" eyebrow="Private area" title={`Hello, ${firstName}!`} />
      <p className={styles.center}>
        Thank you for being part of our story. This area is still under construction: soon you will find here
      </p>
      <ul className={styles.list}>
        <li>the detailed programme of the day</li>
        <li>photos to share and download</li>
        <li>useful info on travel and accommodation</li>
      </ul>
      <p className={`${formStyles.notice} ${styles.center}`}>Come back soon! 💕</p>
      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        Log out
      </button>
      <div className={styles.links}>
        <Link to="/">Back to the wedding site</Link>
      </div>
    </div>
  );
}
