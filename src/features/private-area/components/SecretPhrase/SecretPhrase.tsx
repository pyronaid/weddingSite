import { MISSING_LETTER } from '../../../../services/game';
import { useMessages } from '../../../../i18n';
import { gameMessages } from '../../messages/game';
import styles from './SecretPhrase.module.css';

interface SecretPhraseProps {
  /** One character per letter slot, MISSING_LETTER for the ones still hidden. */
  phrase: string;
}

/** The letters collected so far, with dashes for the missing ones: "-----A----". */
export function SecretPhrase({ phrase }: SecretPhraseProps) {
  const t = useMessages(gameMessages).phrase;
  const slots = [...phrase];
  const found = slots.filter((char) => char !== MISSING_LETTER).length;

  return (
    <figure className={styles.box}>
      <figcaption className={styles.caption}>{t.caption}</figcaption>
      <p className={styles.phrase} aria-hidden="true">
        {slots.map((char, index) => (
          <span key={index} className={char === MISSING_LETTER ? styles.missing : styles.found}>
            {char}
          </span>
        ))}
      </p>
      <p className="visually-hidden">
        {t.summary(phrase, found, slots.length)}
      </p>
      <p className={styles.count} aria-hidden="true">
        {t.count(found, slots.length)}
      </p>
    </figure>
  );
}
