import { Link } from 'react-router';
import { useMessages } from '../../i18n';
import { homeMessages } from '../../pages/homeMessages';
import styles from './Footer.module.css';

const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  coupleNames: string;
  hashtag?: string;
}

export function Footer({ coupleNames, hashtag }: FooterProps) {
  const t = useMessages(homeMessages).footer;
  return (
    <footer className={styles.footer}>
      <p className={styles.names}>{coupleNames}</p>
      {hashtag && <p className={styles.hashtag}>{hashtag}</p>}
      <Link className={styles.privateLink} to="/area">
        {t.privateArea}
      </Link>
      <p className={styles.copy}>
        {t.madeWith} · {CURRENT_YEAR}
      </p>
    </footer>
  );
}
