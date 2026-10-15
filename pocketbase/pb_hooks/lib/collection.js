/// <reference path="../../pb_data/types.d.ts" />

/**
 * Collecting cards, shared by every way of earning one (riddles, photos...).
 * Loaded with require() from the hooks (JSVM handlers share no top-level code).
 */

function isCollected(app, userId, cardId) {
  try {
    app.findFirstRecordByFilter('collected_cards', 'user = {:user} && card = {:card}', { user: userId, card: cardId });
    return true;
  } catch {
    return false;
  }
}

/** Collects the card for the user; a duplicate (double submit) is not an error. */
function collect(app, userId, cardId) {
  if (isCollected(app, userId, cardId)) return;
  const record = new Record(app.findCollectionByNameOrId('collected_cards'));
  record.set('user', userId);
  record.set('card', cardId);
  try {
    app.save(record);
  } catch (error) {
    // Lost a race with a concurrent request: the unique index kept one row.
    if (!isCollected(app, userId, cardId)) throw error;
  }
}

module.exports = { isCollected, collect };
