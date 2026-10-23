import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../../components/Form/Form.module.css';
import { CardHeader } from '../../../../components/InfoCard/CardHeader';
import { buildPhrase, hasLetters, type PlayingCard, type Suit } from '../../../../services/game';
import { useSuitCards } from '../../game/useGameProgress';
import { SUIT_META } from '../../game/suits';
import { AREA_HOME } from '../../guards';
import { FlipCard } from '../FlipCard/FlipCard';
import { SecretPhrase } from '../SecretPhrase/SecretPhrase';
import { SuitRules } from '../SuitRules/SuitRules';
import { useMessages } from '../../../../i18n';
import { gameMessages } from '../../messages/game';
import styles from './SuitCollection.module.css';

interface SuitCollectionProps {
  suit: Suit;
  /** Rendered right after the rules (e.g. the quiz lives). */
  afterRules?: ReactNode;
  /**
   * Rendered under each card (e.g. the photo challenge button). `refresh`
   * reloads the cards; `cards` is the whole suit, sorted by rank.
   */
  renderCardAction?: (card: PlayingCard, refresh: () => void, cards: readonly PlayingCard[]) => ReactNode;
  /** Rendered after the cards (e.g. a link to the gallery). */
  footer?: ReactNode;
}

/** All the cards of a suit, the collected ones highlighted, and the secret phrase (suits with letters). */
export function SuitCollection({ suit, afterRules, renderCardAction, footer }: SuitCollectionProps) {
  const { label, symbol } = SUIT_META[suit];
  const t = useMessages(gameMessages);
  const query = useSuitCards(suit);
  const cards = query.status === 'success' ? query.data : undefined;
  const letters = hasLetters(suit);
  const phrase = useMemo(() => (cards && letters ? buildPhrase(cards) : ''), [cards, letters]);
  const collected = cards?.filter((card) => card.collected).length ?? 0;

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="suit-title" eyebrow={t.collection.eyebrow(symbol)} title={label} />
      <p className={styles.intro}>
        {letters ? t.collection.introLetters : t.collection.introStars}
      </p>
      <SuitRules suit={suit} />
      {afterRules}

      {query.status === 'loading' && (
        <p className={styles.status} role="status">
          {t.collection.loading}
        </p>
      )}

      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          {query.error.code !== 'not_configured' && (
            <button type="button" className={formStyles.textButton} onClick={query.retry}>
              {t.tryAgain}
            </button>
          )}
        </div>
      )}

      {cards && (
        <>
          {letters && <SecretPhrase phrase={phrase} />}
          <p className={styles.status}>
            {t.collection.collected(collected, cards.length)}
          </p>
          <ul className={styles.grid} aria-label={t.collection.list(label)}>
            {cards.map((card) => (
              <li key={card.id}>
                <FlipCard card={card} />
                {renderCardAction?.(card, query.refresh, cards)}
              </li>
            ))}
          </ul>
        </>
      )}

      {footer}

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        {t.backToCollectionArrow}
      </Link>
    </div>
  );
}
