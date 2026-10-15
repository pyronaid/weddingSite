import { Navigate, useParams } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { isSuit } from '../../../services/game';
import { SuitCollection } from '../components/SuitCollection/SuitCollection';
import { SUIT_META } from '../game/suits';
import { AREA_HOME } from '../guards';

/** Page of a single suit: its cards, the collected ones and the secret phrase. */
export function SuitPage() {
  const { suit } = useParams();
  useDocumentTitle(isSuit(suit) ? SUIT_META[suit].label : undefined);

  // Unknown suit in the URL (typo, old link): back to the dashboard.
  if (!isSuit(suit)) return <Navigate to={AREA_HOME} replace />;

  // Keyed by suit: switching suit starts from a fresh state (no flipped cards carried over).
  return <SuitCollection key={suit} suit={suit} />;
}
