import { cardTodos, openItems, suitProgress } from './todo';
import type { AdminCard } from './types';

const card = (overrides: Partial<AdminCard>): AdminCard => ({
  id: 'x',
  suit: 'clubs',
  rank: 5,
  letter: 'A',
  ...overrides,
});

describe('cardTodos', () => {
  it('asks for the letter of Ace..10 of the suits with letters only', () => {
    expect(cardTodos(card({ suit: 'hearts', rank: 1, letter: '', scenes: [{ id: 's', text: 'x' }] }))).toEqual([
      'letter',
    ]);
    expect(cardTodos(card({ suit: 'hearts', rank: 10, letter: ' ', scenes: [{ id: 's', text: 'x' }] }))).toEqual([
      'letter',
    ]);
    // Face cards and spades have no letter.
    expect(cardTodos(card({ suit: 'hearts', rank: 12, letter: '' }))).toEqual([]);
    expect(cardTodos(card({ suit: 'spades', rank: 3, letter: '' }))).toEqual([]);
  });

  it('asks for the riddle and the solution of every club, face cards included', () => {
    expect(cardTodos(card({ rank: 13, letter: '', riddle: '', solution: '' }))).toEqual(['riddle', 'solution']);
    expect(cardTodos(card({ letter: '', riddle: 'Who?', solution: 'ME' }))).toEqual(['letter']);
    expect(cardTodos(card({ riddle: 'Who?', solution: 'ME' }))).toEqual([]);
  });

  it('asks for at least one scene of the numbered hearts', () => {
    expect(cardTodos(card({ suit: 'hearts', scenes: [] }))).toEqual(['scenes']);
    expect(cardTodos(card({ suit: 'hearts', scenes: [{ id: 's', text: 'A hat' }] }))).toEqual([]);
  });

  it('asks for quiz questions, and to replace the example ones', () => {
    const question = (text: string) => ({ id: 'q', text, answers: [] });
    expect(cardTodos(card({ suit: 'diamonds', questions: [] }))).toEqual(['questions']);
    expect(cardTodos(card({ suit: 'diamonds', questions: [question('Where? (example)'), question('Real')] }))).toEqual([
      'exampleQuestions',
    ]);
    expect(cardTodos(card({ suit: 'diamonds', rank: 12, letter: '', questions: [question('Real')] }))).toEqual([]);
  });
});

describe('suitProgress', () => {
  it('lists the cards to set', () => {
    const cards = [card({ id: 'a' }), card({ id: 'b', letter: '' })];
    const progress = suitProgress(
      'clubs',
      cards.map((c) => ({ ...c, riddle: 'R', solution: 'S' })),
    );
    expect(progress.todo.map((c) => c.id)).toEqual(['b']);
    expect(progress.total).toBe(2);
    expect(openItems(progress)).toBe(1);
  });

  it('counts the spades as one thing to do while nobody is to be found', () => {
    expect(openItems(suitProgress('spades', [card({ suit: 'spades' })], []))).toBe(1);
    expect(
      openItems(
        suitProgress('spades', [], [{ id: 'p', firstName: 'A', lastName: 'B', hints: [], assigned: 0, found: 0 }]),
      ),
    ).toBe(0);
  });
});
