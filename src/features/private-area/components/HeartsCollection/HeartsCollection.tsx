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
      intro="Tap a card to flip it. Every card you collect hides a secret on its back: put the letters together to discover the secret phrase."
      rules={
        <section className={styles.rules} aria-labelledby="hearts-rules-title">
          <h3 id="hearts-rules-title" className={styles.rulesTitle}>
            Photo challenge rules
          </h3>
          <ul>
            <li>
              Press <span aria-hidden="true">📷</span> under a card to get the scene to photograph, then upload your
              photo to collect the card.
            </li>
            <li>
              Every press draws a new scene, until you upload a photo: from then on the scene is fixed and you can only
              replace the photo.
            </li>
            <li>For the Jack, Queen and King the scene is told to you in person.</li>
            <li>
              <strong>Every photo of whoever claims victory</strong> (all suits completed) will be checked against the
              scene it was assigned: photos that do not match their scene do not count, so fake or unrelated pictures
              are useless.
            </li>
          </ul>
        </section>
      }
      renderCardAction={(card, refresh) => <PhotoChallenge card={card} onUploaded={refresh} />}
      footer={
        <Link to={GALLERY_PATH} className={styles.gallery}>
          <span aria-hidden="true">🖼️</span> See everyone's photos in the gallery
        </Link>
      }
    />
  );
}
