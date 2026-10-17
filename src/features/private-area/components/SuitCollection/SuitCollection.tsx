import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../../components/Form/Form.module.css';
import { CardHeader } from '../../../../components/InfoCard/CardHeader';
import { buildPhrase, type PlayingCard, type Suit } from '../../../../services/game';
import { useSuitCards } from '../../game/useGameProgress';
import { SUIT_META } from '../../game/suits';
import { AREA_HOME } from '../../guards';
import { FlipCard } from '../FlipCard/FlipCard';
import { SecretPhrase } from '../SecretPhrase/SecretPhrase';
import { SuitRules } from '../SuitRules/SuitRules';
import styles from './SuitCollection.module.css';

interface SuitCollectionProps {
  suit: Suit;
  /** Rendered right after the rules (e.g. the quiz lives). */
  afterRules?: ReactNode;
  /** Rendered under each card (e.g. the photo challenge button). `refresh` reloads the cards. */
  renderCardAction?: (card: PlayingCard, refresh: () => void) => ReactNode;
  /** Rendered after the cards (e.g. a link to the gallery). */
  footer?: ReactNode;
}

/** All the cards of a suit, the collected ones highlighted, and the secret phrase. */
export function SuitCollection({ suit, afterRules, renderCardAction, footer }: SuitCollectionProps) {
  const { label, symbol } = SUIT_META[suit];
  const query = useSuitCards(suit);
  const cards = query.status === 'success' ? query.data : undefined;
  const phrase = useMemo(() => (cards ? buildPhrase(cards) : ''), [cards]);
  const collected = cards?.filter((card) => card.collected).length ?? 0;

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="suit-title" eyebrow={`${symbol} Your collection`} title={label} />
      <p className={styles.intro}>
        Tap a card to flip it. Every card you collect hides a secret on its back: put the letters together to discover
        the secret phrase.
      </p>
      <SuitRules suit={suit} />
      {afterRules}

      {query.status === 'loading' && (
        <p className={styles.status} role="status">
          Shuffling your cards…
        </p>
      )}

      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          {query.error.code !== 'not_configured' && (
            <button type="button" className={formStyles.textButton} onClick={query.retry}>
              Try again
            </button>
          )}
        </div>
      )}

      {cards && (
        <>
          <SecretPhrase phrase={phrase} />
          <p className={styles.status}>
            {collected}/{cards.length} cards collected
          </p>
          <ul className={styles.grid} aria-label={`${label} cards`}>
            {cards.map((card) => (
              <li key={card.id}>
                <FlipCard card={card} />
                {renderCardAction?.(card, query.refresh)}
              </li>
            ))}
          </ul>
        </>
      )}

      {footer}

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        ← Back to your collection
      </Link>
    </div>
  );
}
