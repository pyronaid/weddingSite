import { motion, useReducedMotion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router';
import { wedding } from '../../config/wedding';
import { AuthProvider } from './AuthProvider';
import { FloatingPhotos } from './components/FloatingPhotos';
import styles from './PrivateAreaRoot.module.css';

/**
 * Shell shared by every private area page: auth context, gradient
 * background, floating photos and the centered card hosting the page.
 */
export function PrivateAreaRoot() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const { partnerOne, partnerTwo } = wedding.couple;

  return (
    <AuthProvider>
      <div className={styles.page}>
        <FloatingPhotos photos={wedding.privateAreaPhotos} />

        <header className={styles.header}>
          <Link to="/" className={styles.brand} aria-label="Back to the wedding site">
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
          <Link to="/">← Back to the wedding site</Link>
        </footer>
      </div>
    </AuthProvider>
  );
}
