import { useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import type { AdminRepository } from '../../../services/admin';
import { isSuit, type Suit } from '../../../services/game';
import { SUIT_META } from '../game/suits';
import { AREA_HOME } from '../guards';
import { AdminCardEditor } from './AdminCardEditor';
import { PeopleEditor } from './PeopleEditor';
import { useAdminQuery } from './useAdminQuery';
import styles from './admin.module.css';

const HELP: Record<Suit, string> = {
  hearts: 'Set the secret letter of each card (Ace to 10) and the scenes guests may draw for the photo challenge.',
  diamonds:
    'Set the secret letter of each card (Ace to 10) and its quiz questions: the answers, and which one is correct.',
  spades: 'Set the secret letter of each card (Ace to 10) and the people to find in the “guess who” game, with their hints.',
  clubs: 'Set the secret letter of each card (Ace to 10) and the riddle printed behind each QR code.',
};

/** Organisers' editor of one suit. */
export function AdminSuitPage() {
  const { suit } = useParams();
  useDocumentTitle(isSuit(suit) ? `Edit ${SUIT_META[suit].label}` : undefined);
  if (!isSuit(suit)) return <Navigate to={AREA_HOME} replace />;
  return <AdminSuit key={suit} suit={suit} />;
}

function AdminSuit({ suit }: { suit: Suit }) {
  const { label, symbol } = SUIT_META[suit];
  const load = useCallback((repository: AdminRepository) => repository.getSuit(suit), [suit]);
  const query = useAdminQuery(load);

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="admin-suit-title" eyebrow={`${symbol} Organisers`} title={label} />
      <p className={styles.help}>{HELP[suit]} Changes are live for the guests as soon as you save.</p>

      {query.status === 'loading' && (
        <p className={styles.help} role="status">
          Loading the cards…
        </p>
      )}
      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={query.retry}>
            Try again
          </button>
        </div>
      )}
      {query.status === 'success' && (
        <div className={styles.editors}>
          {query.data.map((card) => (
            <AdminCardEditor key={card.id} card={card} />
          ))}
        </div>
      )}

      {suit === 'spades' && <PeopleEditor />}

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        ← Back to the organisers' home
      </Link>
    </div>
  );
}
