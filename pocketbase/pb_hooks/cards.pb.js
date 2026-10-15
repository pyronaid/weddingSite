/// <reference path="../pb_data/types.d.ts" />

/**
 * Reveals the hidden `letter` of a card only to users who collected it.
 * Runs for every `cards` record sent to a client, including expanded relations.
 * Superusers already see hidden fields, so they are left untouched.
 */
onRecordEnrich((e) => {
  const auth = e.requestInfo.auth;

  if (auth && auth.collection().name === 'users') {
    try {
      e.app.findFirstRecordByFilter('collected_cards', 'user = {:user} && card = {:card}', {
        user: auth.id,
        card: e.record.id,
      });
      e.record.unhide('letter');
    } catch {
      // Not collected (no row found): the letter stays hidden.
    }
  }

  e.next();
}, 'cards');
