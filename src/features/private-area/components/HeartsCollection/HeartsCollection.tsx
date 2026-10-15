import { Link } from 'react-router';
import type { Suit } from '../../../../services/game';
import { GALLERY_PATH } from '../../game/suits';
import { PhotoChallenge } from '../PhotoChallenge/PhotoChallenge';
import { SuitCollection } from '../SuitCollection/SuitCollection';
import styles from './HeartsCollection.module.css';

/** Hearts: the cards are collected with the photo challenge. */
export function HeartsCollection({ suit }: { suit: Suit }) {
  return (
    <SuitCollection
      suit={suit}
      renderCardAction={(card, refresh) => <PhotoChallenge card={card} onUploaded={refresh} />}
      footer={
        <Link to={GALLERY_PATH} className={styles.gallery}>
          <span aria-hidden="true">🖼️</span> See everyone's photos in the gallery
        </Link>
      }
    />
  );
}
