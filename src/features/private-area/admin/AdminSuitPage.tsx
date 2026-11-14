import { Navigate, useParams } from 'react-router';
import { isSuit } from '../../../services/game';
import { ORGANISE_PATH, organisePath } from '../game/suits';

/**
 * /area/admin/suits/<suit>, from older links: each suit is now a sub-tab of
 * the Organise tab (the spades' people to find included).
 */
export function AdminSuitPage() {
  const { suit } = useParams();
  return <Navigate to={isSuit(suit) ? organisePath(suit) : ORGANISE_PATH} replace />;
}
