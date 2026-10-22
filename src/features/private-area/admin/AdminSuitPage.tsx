import { useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useMessages } from '../../../i18n';
import type { AdminRepository } from '../../../services/admin';
import { isSuit, type Suit } from '../../../services/game';
import { SUIT_META } from '../game/suits';
import { AREA_HOME } from '../guards';
import { adminMessages } from '../messages/admin';
import { AdminCardEditor } from './AdminCardEditor';
import { PeopleEditor } from './PeopleEditor';
import { useAdminQuery } from './useAdminQuery';
import styles from './admin.module.css';

/** Organisers' editor of one suit. */
export function AdminSuitPage() {
  const { suit } = useParams();
  const t = useMessages(adminMessages).suitPage;
  useDocumentTitle(isSuit(suit) ? t.title(SUIT_META[suit].label) : undefined);
  if (!isSuit(suit)) return <Navigate to={AREA_HOME} replace />;
  return <AdminSuit key={suit} suit={suit} />;
}

function AdminSuit({ suit }: { suit: Suit }) {
  const { label, symbol } = SUIT_META[suit];
  const t = useMessages(adminMessages).suitPage;

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="admin-suit-title" eyebrow={t.eyebrow(symbol)} title={label} />
      <p className={styles.help}>{t.help[suit]} {t.live}</p>

      {/* Spades ("guess who") have nothing to set per card: only the people to find. */}
      {suit === 'spades' ? <PeopleEditor /> : <CardEditors suit={suit} />}

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        {t.back}
      </Link>
    </div>
  );
}

/** One editor per card of the suit. */
function CardEditors({ suit }: { suit: Suit }) {
  const load = useCallback((repository: AdminRepository) => repository.getSuit(suit), [suit]);
  const query = useAdminQuery(load);
  const messages = useMessages(adminMessages);

  return (
    <>
      {query.status === 'loading' && (
        <p className={styles.help} role="status">
          {messages.suitPage.loading}
        </p>
      )}
      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={query.retry}>
            {messages.common.tryAgain}
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
    </>
  );
}
