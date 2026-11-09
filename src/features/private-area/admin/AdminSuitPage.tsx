import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useMessages } from '../../../i18n';
import { isSuit, type Suit } from '../../../services/game';
import { ORGANISE_PATH, SUIT_META } from '../game/suits';
import { adminMessages } from '../messages/admin';
import { PeopleEditor } from './PeopleEditor';
import styles from './admin.module.css';

/**
 * /area/admin/suits/spades: the people to find of the "guess who" game.
 * The other suits are edited card by card from the Organise tab, where an
 * old link to their page lands.
 */
export function AdminSuitPage() {
  const { suit } = useParams();
  const t = useMessages(adminMessages).suitPage;
  useDocumentTitle(isSuit(suit) ? t.title(SUIT_META[suit].label) : undefined);
  if (!isSuit(suit)) return <Navigate to={ORGANISE_PATH} replace />;
  if (suit !== 'spades') return <Navigate to={`${ORGANISE_PATH}#suit-${suit}`} replace />;
  return <AdminSuit suit={suit} />;
}

function AdminSuit({ suit }: { suit: Suit }) {
  const { label, symbol } = SUIT_META[suit];
  const t = useMessages(adminMessages).suitPage;

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="admin-suit-title" eyebrow={t.eyebrow(symbol)} title={label} />
      <p className={styles.help}>{t.help[suit]} {t.live}</p>

      <PeopleEditor />

      <Link to={`${ORGANISE_PATH}#suit-${suit}`} className={`${formStyles.secondary} ${styles.back}`}>
        {t.back}
      </Link>
    </div>
  );
}
