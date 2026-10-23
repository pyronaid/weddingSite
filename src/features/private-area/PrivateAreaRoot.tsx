import { motion, useReducedMotion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router';
import { useMessages } from '../../i18n';
import { areaPhotos } from '../../services/site/slots';
import { useSiteContent } from '../../site/SiteContentContext';
import { AuthProvider } from './AuthProvider';
import { FloatingPhotos } from './components/FloatingPhotos';
import { shellMessages } from './messages/shell';
import styles from './PrivateAreaRoot.module.css';

/**
 * Shell shared by every private area page: auth context, gradient
 * background, floating photos and the centered card hosting the page.
 */
export function PrivateAreaRoot() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const { content } = useSiteContent();
  const { partnerOne, partnerTwo } = content.couple;
  const t = useMessages(shellMessages);

  return (
    <AuthProvider>
      <div className={styles.page}>
        <FloatingPhotos photos={areaPhotos(content.photos)} />

        <header className={styles.header}>
          <Link to="/" className={styles.brand} aria-label={t.backToSite}>
            {partnerOne} <span>&amp;</span> {partnerTwo}
          </Link>
        </header>

        <main className={styles.main}>
          {/* Keyed by route: each page change replays the entrance animation. */}
          <motion.div
            key={pathname}
            className={styles.card}
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>

        <footer className={styles.footer}>
          <Link to="/">{t.backToSiteArrow}</Link>
        </footer>
      </div>
    </AuthProvider>
  );
}
