import type { ComponentType } from 'react';
import { Navigate, useParams } from 'react-router';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { isSuit, type Suit } from '../../../services/game';
import { DiamondsCollection } from '../components/DiamondsCollection/DiamondsCollection';
import { HeartsCollection } from '../components/HeartsCollection/HeartsCollection';
import { SpadesCollection } from '../components/SpadesCollection/SpadesCollection';
import { SuitCollection } from '../components/SuitCollection/SuitCollection';
import { SUIT_META } from '../game/suits';
import { AREA_HOME } from '../guards';

/** Hearts are collected with photos, diamonds with the quiz, spades with "guess who" selfies, clubs with riddles. */
const COLLECTIONS: Record<Suit, ComponentType<{ suit: Suit }>> = {
  hearts: HeartsCollection,
  diamonds: DiamondsCollection,
  spades: SpadesCollection,
  clubs: SuitCollection,
};

/** Page of a single suit: its cards, the collected ones and the secret phrase. */
export function SuitPage() {
  const { suit } = useParams();
  useDocumentTitle(isSuit(suit) ? SUIT_META[suit].label : undefined);

  // Unknown suit in the URL (typo, old link): back to the dashboard.
  if (!isSuit(suit)) return <Navigate to={AREA_HOME} replace />;

  // Keyed by suit: switching suit starts from a fresh state (no flipped cards carried over).
  const Collection = COLLECTIONS[suit];
  return <Collection key={suit} suit={suit} />;
}
