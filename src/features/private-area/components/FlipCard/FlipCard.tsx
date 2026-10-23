import { useState } from 'react';
import { cardImageUrl, cardName, hasLetters, isFaceCard, type PlayingCard } from '../../../../services/game';
import { useMessages } from '../../../../i18n';
import { gameMessages } from '../../messages/game';
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
  const t = useMessages(gameMessages).flip;
  const name = cardName(card.rank, card.suit);

  let backContent: string | null = null;
  let backDescription = t.back;
  if (card.collected && face) {
    backContent = '★';
    backDescription = t.backStar;
  } else if (card.collected && card.letter) {
    backContent = card.letter;
    backDescription = t.backLetter(card.letter);
  }

  const label = `${name}${card.collected ? t.collected : t.notCollected}${flipped ? t.showing(backDescription) : ''}`;

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
