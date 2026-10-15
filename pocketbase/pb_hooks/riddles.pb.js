/// <reference path="../pb_data/types.d.ts" />

/**
 * Riddle endpoints, reached from the QR code printed on each card poster.
 * Logged-in users only. The answer is checked here, so the solution never
 * leaves the server. Brute force is bounded by the global API rate limiter.
 *
 *   GET  /api/game/riddles/{code}         -> riddle, answer length, collected state
 *   POST /api/game/riddles/{code}/solve   {answer} -> {correct, collected, letter}
 */

routerAdd(
  'GET',
  '/api/game/riddles/{code}',
  (e) => {
    const riddles = require(`${__hooks}/lib/riddles.js`);
    const card = riddles.findRiddleCard(e.app, e.request.pathValue('code'));
    const collected = riddles.isCollected(e.app, e.auth.id, card.id);
    return e.json(200, riddles.toRiddleResponse(card, collected));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/riddles/{code}/solve',
  (e) => {
    const riddles = require(`${__hooks}/lib/riddles.js`);
    const card = riddles.findRiddleCard(e.app, e.request.pathValue('code'));
    const answer = riddles.normalize(e.requestInfo().body.answer);

    if (answer !== riddles.normalize(card.getString('solution'))) {
      return e.json(200, { correct: false, collected: riddles.isCollected(e.app, e.auth.id, card.id), letter: '' });
    }

    riddles.collect(e.app, e.auth.id, card.id);
    return e.json(200, { correct: true, collected: true, letter: card.getString('letter') });
  },
  $apis.requireAuth('users'),
);
