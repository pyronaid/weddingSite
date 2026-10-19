/// <reference path="../pb_data/types.d.ts" />

/**
 * The spades became a "guess who" game: they have no secret letters (nor a
 * secret phrase) any more. Clears the letters already set on them; the
 * organisers' API refuses new ones.
 */
migrate(
  (app) => {
    for (const card of app.findRecordsByFilter('cards', 'suit = "spades" && letter != ""', '', 0, 0)) {
      card.set('letter', '');
      app.save(card);
    }
  },
  () => {
    // The old letters are not kept: set them again from the organisers' view if needed.
  },
);
