import { hasLetters, isFaceCard, type Suit } from '../game';
import type { AdminCard, AdminPerson } from './types';

/**
 * What an organiser must still set on a card before the wedding, i.e. what
 * stops guests from playing it (or would show them placeholder content).
 */
export type CardTodo = 'letter' | 'riddle' | 'solution' | 'scenes' | 'questions' | 'exampleQuestions';

/** The quiz questions created by the migrations end like this until replaced. */
const EXAMPLE_MARK = '(example)';

export function cardTodos(card: AdminCard): CardTodo[] {
  const todos: CardTodo[] = [];
  // Ace..10 of the suits with letters spell the secret phrase.
  if (hasLetters(card.suit) && !isFaceCard(card.rank) && !card.letter.trim()) todos.push('letter');
  if (card.riddle !== undefined && !card.riddle.trim()) todos.push('riddle');
  if (card.solution !== undefined && !card.solution.trim()) todos.push('solution');
  // The photo challenge draws one of the scenes: none, nothing to draw.
  if (card.scenes && card.scenes.length === 0) todos.push('scenes');
  if (card.questions) {
    if (card.questions.length === 0) todos.push('questions');
    else if (card.questions.some((question) => question.text.trim().endsWith(EXAMPLE_MARK)))
      todos.push('exampleQuestions');
  }
  return todos;
}

/** How a suit stands: its cards with something to set, or (spades) whether there is anybody to find. */
export interface SuitProgress {
  suit: Suit;
  /** Cards that still need something (empty for spades: nothing to set per card). */
  todo: AdminCard[];
  total: number;
  /** Spades only: the people of the "guess who" game. */
  people?: number;
}

export function suitProgress(suit: Suit, cards: AdminCard[], people?: AdminPerson[]): SuitProgress {
  return {
    suit,
    todo: cards.filter((card) => cardTodos(card).length > 0),
    total: cards.length,
    ...(suit === 'spades' ? { people: people?.length ?? 0 } : {}),
  };
}

/** Things left to do in a suit: its cards to set, or 1 for spades with nobody to find yet. */
export const openItems = (progress: SuitProgress) =>
  progress.suit === 'spades' ? (progress.people === 0 ? 1 : 0) : progress.todo.length;
