import { useState } from 'react';
import type { GameRepository, GuessStatus, Suit } from '../../../../services/game';
import { useGameQuery } from '../../game/useGameQuery';
import { GuessChallenge } from '../GuessChallenge/GuessChallenge';
import { GuessPanel } from '../GuessPanel/GuessPanel';
import { SuitCollection } from '../SuitCollection/SuitCollection';

const loadStatus = (repository: GameRepository) => repository.getGuessStatus();

/**
 * Spades: "guess who". The cards unlock in order (each one needs the
 * previous card's selfie); after the King comes the final guess.
 */
export function SpadesCollection({ suit }: { suit: Suit }) {
  const query = useGameQuery(loadStatus);
  // A correct guess returns the new status: no need to reload it.
  const [found, setFound] = useState<GuessStatus | null>(null);
  const status = found ?? (query.status === 'success' ? query.data : undefined);
  const { refresh } = query;

  return (
    <SuitCollection
      suit={suit}
      afterRules={<GuessPanel status={status} onFound={setFound} />}
      renderCardAction={(card, refreshCards, cards) => {
        const previous = cards.find((other) => other.rank === card.rank - 1);
        return (
          <GuessChallenge
            card={card}
            locked={card.rank > 1 && !previous?.collected}
            onCollected={() => {
              refreshCards();
              // The first selfie means the person is drawn; the last one opens the guess.
              refresh();
            }}
          />
        );
      }}
    />
  );
}
