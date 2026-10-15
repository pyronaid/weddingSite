import type { ComponentType } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { isSuit, type Suit } from '../../../services/game';
import { SuitCollection } from '../components/SuitCollection/SuitCollection';
import { SUIT_META } from '../game/suits';
import { AREA_HOME } from '../guards';
import styles from './pages.module.css';

/** Content of each suit page; suits not listed yet show a placeholder. */
const SUIT_CONTENT: Partial<Record<Suit, ComponentType<{ suit: Suit }>>> = {
  clubs: SuitCollection,
};

export function SuitPage() {
  const { suit } = useParams();
  const meta = isSuit(suit) ? SUIT_META[suit] : undefined;
  useDocumentTitle(meta?.label);

  // Unknown suit in the URL (typo, old link): back to the dashboard.
  if (!isSuit(suit) || !meta) return <Navigate to={AREA_HOME} replace />;

  const Content = SUIT_CONTENT[suit];
  if (Content) return <Content suit={suit} />;

  return (
    <div className={styles.stack}>
      <span className={`${styles.icon} ${styles[meta.colour]}`} aria-hidden="true">
        {meta.symbol}
      </span>
      <CardHeader id="suit-title" eyebrow="Your collection" title={meta.label} />
      <p className={`${formStyles.notice} ${styles.center}`}>
        This page is under construction: soon you will find here the {meta.label.toLowerCase()} you collected and
        the ones still missing.
      </p>
      <Link to={AREA_HOME} className={formStyles.secondary}>
        ← Back to your collection
      </Link>
    </div>
  );
}
