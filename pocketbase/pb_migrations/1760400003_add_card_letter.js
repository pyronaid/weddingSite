/// <reference path="../pb_data/types.d.ts" />

/**
 * Adds the secret `letter` of each card. Collecting the numbered cards of a
 * suit (Ace..10) reveals, letter by letter, that suit's secret phrase.
 *
 * The field is `hidden`: it is never returned to, nor filterable or sortable
 * by, regular users (no guessing with `?filter=letter="A"`).
 * pb_hooks/cards.pb.js reveals it only on the cards the user has collected.
 * Superusers see and edit it in the admin UI.
 */
migrate(
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    cards.fields.add(new TextField({ name: 'letter', max: 1, hidden: true }));
    app.save(cards);
  },
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    cards.fields.removeByName('letter');
    app.save(cards);
  },
);
