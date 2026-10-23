import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useMessages } from '../../../i18n';
import { SUITS } from '../../../services/game';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { adminSuitPath, SITE_SETTINGS_PATH } from '../game/suits';
import { useAuth } from '../useAuth';
import pageStyles from '../pages/pages.module.css';
import { adminMessages } from '../messages/admin';
import { siteSettingsMessages } from '../messages/siteSettings';
import { SignupCodeForm } from './SignupCodeForm';
import styles from './admin.module.css';

/** Home of the private area for organisers: what to edit in each suit. */
export function AdminDashboard() {
  const { user, auth } = useAuth();
  const t = useMessages(adminMessages).dashboard;
  const site = useMessages(siteSettingsMessages);
  const firstName = user?.name.split(' ')[0] || t.fallbackName;

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="dashboard-title" eyebrow={t.eyebrow} title={t.hello(firstName)} />
      <p className={pageStyles.center}>
        {t.intro}
      </p>

      {/* The bride and groom: language, names, date, places, gift and photos of the site. */}
      {user?.isSuperAdmin && (
        <Link to={SITE_SETTINGS_PATH} className={styles.siteLink}>
          <span className={styles.siteLinkTitle}>⚙︎ {site.linkTitle}</span>
          <span>{site.linkText}</span>
        </Link>
      )}

      <section aria-labelledby="admin-suits-title">
        <h3 id="admin-suits-title" className={pageStyles.sectionTitle}>
          {t.suitsTitle}
        </h3>
        <div className={styles.suits}>
          {SUITS.map((suit) => (
            <SuitCard key={suit} suit={suit} to={adminSuitPath(suit)} caption={t.captions[suit]} />
          ))}
        </div>
      </section>

      <SignupCodeForm />

      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        {t.logout}
      </button>
      <div className={pageStyles.links}>
        <Link to="/">{t.backToSite}</Link>
      </div>
    </div>
  );
}
