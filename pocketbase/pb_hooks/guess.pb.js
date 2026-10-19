/// <reference path="../pb_data/types.d.ts" />

/**
 * "Guess who" (spades), logged-in users only. The person to find never
 * leaves the server until it is guessed.
 *
 *   GET  /api/game/guess/status            {assigned, complete, found, name, lengths}
 *   POST /api/game/guess/{cardId}          the hints up to this card, its selfie, the previous
 *                                          selfie (or {locked}); the Ace draws the person
 *   POST /api/game/guess/{cardId}/selfie   multipart `photo`: a new selfie, collects the card
 *   POST /api/game/guess/{cardId}/confirm  "same person as before": reuses the previous selfie
 *   POST /api/game/guess/solve             {firstName, lastName} -> {correct, name}
 */

routerAdd(
  'GET',
  '/api/game/guess/status',
  (e) => {
    const guess = require(`${__hooks}/lib/guess.js`);
    return e.json(200, guess.status(e.app, e.auth.id));
  },
  $apis.requireAuth('users'),
);

// Registered before /{cardId}: a fixed segment wins over a wildcard anyway.
routerAdd(
  'POST',
  '/api/game/guess/solve',
  (e) => {
    const guess = require(`${__hooks}/lib/guess.js`);
    return e.json(200, guess.solve(e.app, e.auth.id, e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/guess/{cardId}',
  (e) => {
    const guess = require(`${__hooks}/lib/guess.js`);
    const card = guess.findGuessCard(e.app, e.request.pathValue('cardId'));
    return e.json(200, guess.cardView(e.app, e.auth, card));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/guess/{cardId}/selfie',
  (e) => {
    const guess = require(`${__hooks}/lib/guess.js`);
    const card = guess.findGuessCard(e.app, e.request.pathValue('cardId'));
    let files = [];
    try {
      files = e.findUploadedFiles('photo');
    } catch {
      // No file in the request: reported below.
    }
    return e.json(200, guess.uploadSelfie(e.app, e.auth, card, files));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/game/guess/{cardId}/confirm',
  (e) => {
    const guess = require(`${__hooks}/lib/guess.js`);
    const card = guess.findGuessCard(e.app, e.request.pathValue('cardId'));
    return e.json(200, guess.confirmPrevious(e.app, e.auth, card));
  },
  $apis.requireAuth('users'),
);
