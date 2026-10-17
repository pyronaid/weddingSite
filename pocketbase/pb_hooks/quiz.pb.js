/// <reference path="../pb_data/types.d.ts" />

/**
 * Quiz (diamonds), logged-in users only. The correct answers never leave
 * the server.
 *
 *   GET  /api/game/quiz/status                {lives, maxLives, penalties}
 *   POST /api/game/quiz/{cardId}/question     the user's current question for the card
 *                                             (drawn once, kept until answered) or {solved}
 *   POST /api/game/quiz/{cardId}/answer       {questionId, answerId} -> {correct, letter | question, status}
 */

routerAdd(
  'GET',
  '/api/game/quiz/status',
  (e) => {
    const quiz = require(`${__hooks}/lib/quiz.js`);
    return e.json(200, quiz.playerStatus(e.app, e.auth.id));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/quiz/{cardId}/question',
  (e) => {
    const quiz = require(`${__hooks}/lib/quiz.js`);
    const card = quiz.findQuizCard(e.app, e.request.pathValue('cardId'));
    return e.json(200, quiz.getQuestion(e.app, e.auth.id, card));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/quiz/{cardId}/answer',
  (e) => {
    const quiz = require(`${__hooks}/lib/quiz.js`);
    const card = quiz.findQuizCard(e.app, e.request.pathValue('cardId'));
    const body = e.requestInfo().body;
    return e.json(200, quiz.answer(e.app, e.auth.id, card, String(body.questionId || ''), String(body.answerId || '')));
  },
  $apis.requireAuth('users'),
);
