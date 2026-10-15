import { createContext, useContext } from 'react';
import { createGameRepository, type GameRepository } from '../../../services/game';

const GameRepositoryContext = createContext<GameRepository | null>(null);

/** Lets tests (or another backend) inject a repository; production uses the default. */
export const GameRepositoryProvider = GameRepositoryContext.Provider;

// One repository per page load, created on first use.
let defaultRepository: GameRepository | undefined;

export function useGameRepository(): GameRepository {
  return useContext(GameRepositoryContext) ?? (defaultRepository ??= createGameRepository());
}
