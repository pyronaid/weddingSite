/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/quiz.pb.js (loaded with require()). */

const { isCollected, collect } = require(`${__hooks}/lib/collection.js`);
const { t } = require(`${__hooks}/lib/i18n.js`);

const QUIZ_SUIT = 'diamonds';
/** Wrong answers allowed before they turn into penalties (all diamonds together). */
const LIVES = 3;
const isFaceCard = (rank) => rank >= 11;

function findQuizCard(app, cardId) {
  let card;
  try {
    card = app.findRecordById('cards', cardId || '');
  } catch {
    throw new NotFoundError(t(app, 'card_not_found'));
  }
  if (card.getString('suit') !== QUIZ_SUIT) throw new NotFoundError(t(app, 'no_quiz'));
  return card;
}

/** Lives left and penalties, from the wrong answers of every diamonds card. */
function playerStatus(app, userId) {
  const attempts = app.findRecordsByFilter('quiz_attempts', 'user = {:user}', '', 0, 0, { user: userId });
  const mistakes = attempts.reduce((sum, attempt) => sum + attempt.getInt('wrong'), 0);
  return { lives: Math.max(0, LIVES - mistakes), maxLives: LIVES, penalties: Math.max(0, mistakes - LIVES) };
}

function findAttempt(app, userId, cardId) {
  try {
    return app.findFirstRecordByFilter('quiz_attempts', 'user = {:user} && card = {:card}', { user: userId, card: cardId });
  } catch {
    const attempt = new Record(app.findCollectionByNameOrId('quiz_attempts'));
    attempt.set('user', userId);
    attempt.set('card', cardId);
    attempt.set('seen', []);
    attempt.set('wrong', 0);
    return attempt;
  }
}

function seenIds(attempt) {
  // A JSON field reads back as raw bytes: parse its string form.
  try {
    const parsed = JSON.parse(attempt.getString('seen') || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Random question of the card, preferring the ones never faced; when all
 * were faced, any but `excludeId` (unless it is the only one).
 */
function pickQuestion(app, cardId, seen, excludeId) {
  const all = app.findRecordsByFilter('quiz_questions', 'card = {:card}', '', 0, 0, { card: cardId });
  if (all.length === 0) throw new NotFoundError(t(app, 'no_questions'));
  const others = all.filter((question) => question.id !== excludeId);
  const unseen = others.filter((question) => !seen.includes(question.id));
  const pool = unseen.length > 0 ? unseen : others.length > 0 ? others : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setCurrent(attempt, question) {
  const seen = seenIds(attempt);
  if (!seen.includes(question.id)) seen.push(question.id);
  attempt.set('question', question.id);
  attempt.set('seen', seen);
}

/** The question as guests see it: never which answer is correct. */
const LETTERS = 'ABCDEFGHIJ';

/**
 * The question as guests see it: never which answer is correct.
 *
 * Jack, Queen and King are asked IN PERSON: the guest gets neither the
 * question nor the answers, only the question number and the letters A, B,
 * C... The person asking reads them from the organisers' view, which lists
 * the questions and answers in the same (creation) order.
 */
function questionView(app, question, card) {
  if (isFaceCard(card.getInt('rank'))) {
    const answers = app.findRecordsByFilter('quiz_answers', 'question = {:question}', 'created', 0, 0, {
      question: question.id,
    });
    const siblings = app.findRecordsByFilter('quiz_questions', 'card = {:card}', 'created', 0, 0, { card: card.id });
    return {
      questionId: question.id,
      inPerson: true,
      number: siblings.findIndex((item) => item.id === question.id) + 1,
      text: '',
      answers: answers.map((answer, index) => ({ id: answer.id, text: LETTERS[index] || String(index + 1) })),
    };
  }
  // Sorted by (random) id: a stable order that does not follow creation order.
  const answers = app.findRecordsByFilter('quiz_answers', 'question = {:question}', 'id', 0, 0, {
    question: question.id,
  });
  return {
    questionId: question.id,
    inPerson: false,
    text: question.getString('text'),
    answers: answers.map((answer) => ({ id: answer.id, text: answer.getString('text') })),
  };
}

function currentQuestion(app, attempt) {
  const id = attempt.getString('question');
  if (!id) return null;
  try {
    return app.findRecordById('quiz_questions', id);
  } catch {
    return null; // deleted by the organisers
  }
}

/** The user's question for a card: the same one until it is answered. */
function getQuestion(app, userId, card) {
  if (isCollected(app, userId, card.id)) {
    return { solved: true, letter: card.getString('letter'), status: playerStatus(app, userId) };
  }
  const attempt = findAttempt(app, userId, card.id);
  let question = currentQuestion(app, attempt);
  if (!question) {
    question = pickQuestion(app, card.id, seenIds(attempt), '');
    setCurrent(attempt, question);
    app.save(attempt);
  }
  return { solved: false, question: questionView(app, question, card), status: playerStatus(app, userId) };
}

/**
 * Checks an answer to the current question. Right: the card is collected.
 * Wrong: one more mistake (a life, then a penalty) and a new question.
 * An answer to an old question (double submit, other tab) changes nothing.
 */
function answer(app, userId, card, questionId, answerId) {
  if (isCollected(app, userId, card.id)) {
    return { correct: true, letter: card.getString('letter'), status: playerStatus(app, userId) };
  }
  const attempt = findAttempt(app, userId, card.id);
  const current = currentQuestion(app, attempt);
  if (!current || current.id !== questionId) {
    const fresh = getQuestion(app, userId, card);
    return { correct: false, stale: true, question: fresh.question, status: fresh.status };
  }

  let chosen;
  try {
    chosen = app.findFirstRecordByFilter('quiz_answers', 'id = {:id} && question = {:question}', {
      id: answerId || '',
      question: questionId,
    });
  } catch {
    throw new BadRequestError(t(app, 'choose_answer'));
  }

  if (chosen.getBool('correct')) {
    attempt.set('question', '');
    app.save(attempt);
    collect(app, userId, card.id);
    return { correct: true, letter: card.getString('letter'), status: playerStatus(app, userId) };
  }

  attempt.set('wrong', attempt.getInt('wrong') + 1);
  const next = pickQuestion(app, card.id, seenIds(attempt), current.id);
  setCurrent(attempt, next);
  app.save(attempt);
  return { correct: false, question: questionView(app, next, card), status: playerStatus(app, userId) };
}

module.exports = { findQuizCard, playerStatus, getQuestion, answer };
