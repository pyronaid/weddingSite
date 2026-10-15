/// <reference path="../pb_data/types.d.ts" />

/**
 * "Find the joker" game: a 52-card deck and the cards each guest collected.
 *
 * - `cards`: the deck (4 suits x 13 ranks), seeded below. Read-only for
 *   logged-in users; managed by superusers.
 * - `collected_cards`: one row per (user, card). Users can only read their own
 *   rows. Nobody can award themselves a card through the API (create is
 *   superuser-only) until the collecting mechanics are defined server side.
 */
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = 13;

migrate(
  (app) => {
    const cards = new Collection({
      type: 'base',
      name: 'cards',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'suit', type: 'select', required: true, maxSelect: 1, values: SUITS, presentable: true },
        // 1 = Ace, 11 = Jack, 12 = Queen, 13 = King.
        { name: 'rank', type: 'number', required: true, min: 1, max: RANKS, onlyInt: true, presentable: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cards_suit_rank ON cards (suit, rank)'],
    });
    app.save(cards);

    for (const suit of SUITS) {
      for (let rank = 1; rank <= RANKS; rank++) {
        const record = new Record(cards);
        record.set('suit', suit);
        record.set('rank', rank);
        app.save(record);
      }
    }

    const users = app.findCollectionByNameOrId('users');
    const collected = new Collection({
      type: 'base',
      name: 'collected_cards',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      // A card can be collected only once per user.
      indexes: ['CREATE UNIQUE INDEX idx_collected_cards_user_card ON collected_cards (user, card)'],
    });
    app.save(collected);
  },
  (app) => {
    // Dependants first: collected_cards references cards.
    app.delete(app.findCollectionByNameOrId('collected_cards'));
    app.delete(app.findCollectionByNameOrId('cards'));
  },
);
