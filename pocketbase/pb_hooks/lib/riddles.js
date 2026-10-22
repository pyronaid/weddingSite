/// <reference path="../../pb_data/types.d.ts" />

/**
 * Shared helpers for pb_hooks/riddles.pb.js. JSVM handlers run in isolated
 * runtimes, so they `require()` this module instead of sharing top-level code.
 */

const { isCollected, collect } = require(`${__hooks}/lib/collection.js`);
const { t } = require(`${__hooks}/lib/i18n.js`);

const CODE_PATTERN = /^[a-z0-9]{8,32}$/;

/**
 * Uppercase, letters and digits only, accents folded: "  apple " and
 * "A P P L E" both become "APPLE", "Café" becomes "CAFE" (as typed in the boxes).
 */
function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** The card behind a QR code, or a 404 when unknown or not playable yet. */
function findRiddleCard(app, code) {
  if (!CODE_PATTERN.test(code || '')) throw new NotFoundError(t(app, 'riddle_not_found'));

  let card;
  try {
    card = app.findFirstRecordByFilter('cards', 'code = {:code}', { code });
  } catch {
    throw new NotFoundError(t(app, 'riddle_not_found'));
  }
  if (!card.getString('riddle') || !normalize(card.getString('solution'))) {
    throw new NotFoundError(t(app, 'riddle_not_ready'));
  }
  return card;
}

/** Public view of a riddle: never includes the solution or the code. */
function toRiddleResponse(card, collected) {
  return {
    suit: card.getString('suit'),
    rank: card.getInt('rank'),
    riddle: card.getString('riddle'),
    length: normalize(card.getString('solution')).length,
    collected,
    letter: collected ? card.getString('letter') : '',
  };
}

module.exports = { normalize, findRiddleCard, isCollected, collect, toRiddleResponse };
