import { useState } from 'react';
import { cardImageUrl, hasLetters, isFaceCard, rankName, type PlayingCard } from '../../../../services/game';
import { SUIT_META } from '../../game/suits';
import styles from './FlipCard.module.css';

interface FlipCardProps {
  card: PlayingCard;
}

/**
 * A playing card that flips on click/tap (or Enter/Space: it is a button).
 * Front: the standard card image. Back: the card back, plus the secret letter
 * (numbered cards) or a star (Jack, Queen, King, and every spade: they have
 * no letters) once the card is collected.
 */
export function FlipCard({ card }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const face = isFaceCard(card.rank) || !hasLetters(card.suit);
  const name = `${rankName(card.rank)} of ${SUIT_META[card.suit].label.toLowerCase()}`;

  let backContent: string | null = null;
  let backDescription = 'card back';
  if (card.collected && face) {
    backContent = '★';
    backDescription = 'card back with a star';
  } else if (card.collected && card.letter) {
    backContent = card.letter;
    backDescription = `card back with the letter ${card.letter}`;
  }

  const label = `${name}${card.collected ? ', collected' : ', not collected'}${flipped ? `, showing the ${backDescription}` : ''}`;

  return (
    <button
      type="button"
      className={`${styles.card} ${card.collected ? styles.collected : ''} ${flipped ? styles.flipped : ''}`}
      aria-pressed={flipped}
      aria-label={label}
      onClick={() => setFlipped((value) => !value)}
    >
      <span className={styles.inner}>
        <span className={`${styles.face} ${styles.front}`}>
          <img src={cardImageUrl(card.suit, card.rank)} alt="" loading="lazy" decoding="async" draggable={false} />
        </span>
        <span className={`${styles.face} ${styles.back}`}>
          {backContent && (
            <span className={face ? styles.star : styles.letter} aria-hidden="true">
              {backContent}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
