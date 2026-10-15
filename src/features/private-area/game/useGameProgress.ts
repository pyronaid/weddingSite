import { useCallback } from 'react';
import type { GameRepository, Suit } from '../../../services/game';
import { useGameQuery } from './useGameQuery';

const loadProgress = (repository: GameRepository) => repository.getProgress();

/** Collected/total cards per suit for the current user. */
export function useGameProgress() {
  return useGameQuery(loadProgress);
}

/** Every card of a suit with the current user's collected state. */
export function useSuitCards(suit: Suit) {
  const load = useCallback((repository: GameRepository) => repository.getSuitCards(suit), [suit]);
  return useGameQuery(load);
}
