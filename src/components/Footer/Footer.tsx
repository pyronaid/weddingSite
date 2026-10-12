import styles from './Footer.module.css';

const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  coupleNames: string;
  hashtag?: string;
  privateAreaUrl: string;
}

export function Footer({ coupleNames, hashtag, privateAreaUrl }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <p className={styles.names}>{coupleNames}</p>
      {hashtag && <p className={styles.hashtag}>{hashtag}</p>}
      <a className={styles.privateLink} href={privateAreaUrl} target="_blank" rel="noopener noreferrer">
        Private area
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      <p className={styles.copy}>Made with ♥ · {CURRENT_YEAR}</p>
    </footer>
  );
}
