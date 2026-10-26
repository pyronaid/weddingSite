import { Link } from 'react-router';
import { useMessages } from '../../../i18n';
import { editableSuits } from '../../../services/auth';
import { SuitCard } from '../components/SuitCard/SuitCard';
import { adminSuitPath, SITE_SETTINGS_PATH, SUIT_META } from '../game/suits';
import { useAuth } from '../useAuth';
import pageStyles from '../pages/pages.module.css';
import { adminMessages } from '../messages/admin';
import { siteSettingsMessages } from '../messages/siteSettings';
import styles from './admin.module.css';

/**
 * The organisers' part of the private area home, under the player's own
 * collection: one card per suit the user edits. Super admins also get the
 * link to the site settings (content, photos, organisers, sign-up code).
 * Nothing for the other guests.
 */
export function OrganiserPanel() {
  const { user } = useAuth();
  const t = useMessages(adminMessages).dashboard;
  const site = useMessages(siteSettingsMessages);
  const suits = editableSuits(user);
  if (suits.length === 0) return null;

  const names = suits.map((suit) => SUIT_META[suit].label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${t.and} ${names[names.length - 1]}` : names[0];

  return (
    <section className={styles.organiser} aria-labelledby="organiser-title">
      <h3 id="organiser-title" className={pageStyles.sectionTitle}>
        {t.title}
      </h3>
      <p className={pageStyles.center}>{user?.isSuperAdmin ? t.introAll : t.introSome(list)}</p>

      {/* The bride and groom: language, names, date, places, gift and photos of the site. */}
      {user?.isSuperAdmin && (
        <Link to={SITE_SETTINGS_PATH} className={styles.siteLink}>
          <span className={styles.siteLinkTitle}>⚙︎ {site.linkTitle}</span>
          <span>{site.linkText}</span>
        </Link>
      )}

      <div className={styles.suits}>
        {suits.map((suit) => (
          <SuitCard key={suit} suit={suit} to={adminSuitPath(suit)} caption={t.captions[suit]} />
        ))}
      </div>
    </section>
  );
}
