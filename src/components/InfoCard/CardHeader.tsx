import styles from './CardHeader.module.css';

interface CardHeaderProps {
  id: string;
  eyebrow: string;
  title: string;
}

/** Shared heading used by every info card, keeps typography consistent. */
export function CardHeader({ id, eyebrow, title }: CardHeaderProps) {
  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <span className={styles.divider} aria-hidden="true">
        ❦
      </span>
    </header>
  );
}
