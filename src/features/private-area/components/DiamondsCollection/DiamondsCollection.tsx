import { useState } from 'react';
import type { GameRepository, QuizStatus, Suit } from '../../../../services/game';
import { useGameQuery } from '../../game/useGameQuery';
import { LivesBar } from '../LivesBar/LivesBar';
import { QuizChallenge } from '../QuizChallenge/QuizChallenge';
import { SuitCollection } from '../SuitCollection/SuitCollection';

const loadStatus = (repository: GameRepository) => repository.getQuizStatus();

/** Diamonds: the cards are won with the quiz; lives are shared by all the cards. */
export function DiamondsCollection({ suit }: { suit: Suit }) {
  const query = useGameQuery(loadStatus);
  // Every answer returns the new lives/penalties: no need to reload them.
  const [latest, setLatest] = useState<QuizStatus | null>(null);
  const status = latest ?? (query.status === 'success' ? query.data : undefined);

  return (
    <SuitCollection
      suit={suit}
      afterRules={<LivesBar status={status} />}
      renderCardAction={(card, refresh) => (
        <QuizChallenge card={card} onStatus={setLatest} onCollected={refresh} />
      )}
    />
  );
}
