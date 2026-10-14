import { Link } from 'react-router';
import styles from './Footer.module.css';

const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  coupleNames: string;
  hashtag?: string;
}

export function Footer({ coupleNames, hashtag }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <p className={styles.names}>{coupleNames}</p>
      {hashtag && <p className={styles.hashtag}>{hashtag}</p>}
      <Link className={styles.privateLink} to="/area">
        Private area
      </Link>
      <p className={styles.copy}>Made with ♥ · {CURRENT_YEAR}</p>
    </footer>
  );
}
