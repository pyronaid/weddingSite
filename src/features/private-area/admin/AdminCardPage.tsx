import { useCallback, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useMessages } from '../../../i18n';
import { cardTodos, type AdminCard, type AdminRepository } from '../../../services/admin';
import { cardImageUrl, cardName, isSuit, type Suit } from '../../../services/game';
import { adminCardPath, ORGANISE_PATH, organisePath, SUIT_META } from '../game/suits';
import { adminMessages } from '../messages/admin';
import { AdminCardEditor } from './AdminCardEditor';
import styles from './admin.module.css';
import { useAdminQuery } from './useAdminQuery';
import { useTodoText } from './useTodoText';

/** /area/admin/cards/:suit/:rank: the editor of one card, with what is still missing. */
export function AdminCardPage() {
  const { suit, rank } = useParams();
  const number = Number(rank);
  if (!isSuit(suit)) return <Navigate to={ORGANISE_PATH} replace />;
  // Spades have nothing to set per card: their people to find instead.
  if (suit === 'spades') return <Navigate to={organisePath('spades')} replace />;
  if (!Number.isInteger(number) || number < 1 || number > 13) return <Navigate to={ORGANISE_PATH} replace />;
  // Keyed by suit only: moving to another card of the suit keeps the loaded cards.
  return <SuitCards key={suit} suit={suit} rank={number} />;
}

function SuitCards({ suit, rank }: { suit: Suit; rank: number }) {
  const messages = useMessages(adminMessages);
  const load = useCallback((repository: AdminRepository) => repository.getSuit(suit), [suit]);
  const query = useAdminQuery(load);
  // Cards saved on this page, newer than the loaded ones (back and forth between cards).
  const [saved, setSaved] = useState<Record<string, AdminCard>>({});

  if (query.status === 'loading') {
    return (
      <p className={styles.help} role="status" data-layout="wide">
        {messages.organise.loading}
      </p>
    );
  }
  if (query.status === 'error') {
    return (
      <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`} data-layout="wide">
        {query.error.message}{' '}
        <button type="button" className={formStyles.textButton} onClick={query.retry}>
          {messages.common.tryAgain}
        </button>
      </div>
    );
  }

  const cards = query.data.map((card) => saved[card.id] ?? card);
  const index = cards.findIndex((card) => card.rank === rank);
  if (index === -1) return <Navigate to={ORGANISE_PATH} replace />;
  return (
    <CardView
      card={cards[index]}
      previous={cards[index - 1]}
      next={cards[index + 1]}
      onChange={(card) => setSaved((current) => ({ ...current, [card.id]: card }))}
    />
  );
}

interface CardViewProps {
  card: AdminCard;
  previous?: AdminCard;
  next?: AdminCard;
  onChange: (card: AdminCard) => void;
}

function CardView({ card, previous, next, onChange }: CardViewProps) {
  const messages = useMessages(adminMessages);
  const t = messages.cardPage;
  const todoText = useTodoText();
  const name = cardName(card.rank, card.suit);
  useDocumentTitle(t.title(name));
  const todos = cardTodos(card);
  const { symbol } = SUIT_META[card.suit];
  const navName = (other: AdminCard) => cardName(other.rank, other.suit);

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="admin-card-title" eyebrow={`${symbol} ${messages.organise.title}`} title={name} />

      <div className={styles.cardLayout}>
        <div className={styles.cardSide}>
          <img
            src={cardImageUrl(card.suit, card.rank)}
            alt=""
            className={`${styles.bigCard} ${todos.length > 0 ? styles.tileTodo : styles.tileDone}`}
          />
          <p role="status" className={todos.length > 0 ? styles.remaining : styles.allSet}>
            {todos.length > 0 ? t.missing(todoText(todos)) : t.allSet}
          </p>
        </div>
        {/* Keyed by card: each card starts its own form. */}
        <AdminCardEditor key={card.id} card={card} onChange={onChange} showHeader={false} />
      </div>

      <nav className={styles.cardNav} aria-label={t.others}>
        {previous ? (
          <Link to={adminCardPath(previous.suit, previous.rank)}>{t.previous(navName(previous))}</Link>
        ) : (
          <span />
        )}
        {next ? <Link to={adminCardPath(next.suit, next.rank)}>{t.next(navName(next))}</Link> : <span />}
      </nav>

      <Link to={organisePath(card.suit)} className={`${formStyles.secondary} ${styles.back}`}>
        {t.back}
      </Link>
    </div>
  );
}
