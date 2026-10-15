import type PocketBase from 'pocketbase';
import { gameError, toGameError } from './errors';
import { isSuit, SUITS, type GameProgress, type GameRepository, type Suit } from './types';

const CARDS = 'cards';
const COLLECTED = 'collected_cards';

interface CardRow {
  suit: string;
}

interface CollectedRow {
  expand?: { card?: CardRow };
}

function countBySuit(suits: Iterable<string>): Record<Suit, number> {
  const counts = Object.fromEntries(SUITS.map((suit) => [suit, 0])) as Record<Suit, number>;
  for (const suit of suits) {
    // Ignore values unknown to this build (e.g. a suit added on the server first).
    if (isSuit(suit)) counts[suit] += 1;
  }
  return counts;
}

export class PocketBaseGameRepository implements GameRepository {
  private readonly pb: PocketBase;

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  async getProgress(): Promise<GameProgress> {
    const userId = this.pb.authStore.isValid ? this.pb.authStore.record?.id : undefined;
    if (!userId) throw gameError('unauthenticated');

    try {
      // Totals come from the deck too, so changing it never needs a frontend
      // release. `fields` keeps both payloads to the bare minimum.
      const [deck, collected] = await Promise.all([
        this.pb.collection(CARDS).getFullList<CardRow>({ fields: 'suit' }),
        this.pb.collection(COLLECTED).getFullList<CollectedRow>({
          // The list rule already limits rows to the current user; the explicit
          // filter documents the intent and keeps it right for superusers too.
          filter: this.pb.filter('user = {:userId}', { userId }),
          expand: 'card',
          fields: 'expand.card.suit',
        }),
      ]);

      const totals = countBySuit(deck.map((card) => card.suit));
      const owned = countBySuit(collected.flatMap((row) => row.expand?.card?.suit ?? []));

      return Object.fromEntries(
        SUITS.map((suit) => [suit, { collected: owned[suit], total: totals[suit] }]),
      ) as GameProgress;
    } catch (error) {
      throw toGameError(error);
    }
  }
}
