/// <reference path="../pb_data/types.d.ts" />

/**
 * Riddles: every card can have a riddle; solving it collects the card.
 *
 * New `cards` fields, all `hidden` (never sent to regular users, nor
 * filterable/sortable by them):
 * - `code`: random secret used in the QR code URL (/area/riddles/<code>).
 *   Auto-generated for new cards; edit it in the admin UI to invalidate a
 *   printed poster.
 * - `riddle`: the riddle text, served only by pb_hooks/riddles.pb.js.
 * - `solution`: letters/digits only, compared case-insensitively on the
 *   server. A riddle without a solution is "not available yet".
 *
 * The clubs get placeholder riddles. Solutions are NOT seeded on purpose:
 * this file is in the repository, so set them in the admin UI.
 */
const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 12;

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.',
];

migrate(
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    cards.fields.add(
      new TextField({
        name: 'code',
        hidden: true,
        min: 8,
        max: 32,
        pattern: '^[a-z0-9]+$',
        autogeneratePattern: `[a-z0-9]{${CODE_LENGTH}}`,
      }),
    );
    cards.fields.add(new TextField({ name: 'riddle', hidden: true, max: 2000 }));
    cards.fields.add(new TextField({ name: 'solution', hidden: true, max: 24, pattern: '^[A-Za-z0-9]*$' }));
    app.save(cards);

    // Backfill existing cards before the unique index (empty codes would clash).
    const records = app.findAllRecords('cards');
    for (const record of records) {
      record.set('code', $security.randomStringWithAlphabet(CODE_LENGTH, CODE_ALPHABET));
      if (record.getString('suit') === 'clubs') {
        record.set('riddle', LOREM[(record.getInt('rank') - 1) % LOREM.length]);
      }
      app.save(record);
    }

    cards.fields.getByName('code').required = true;
    cards.indexes.push('CREATE UNIQUE INDEX idx_cards_code ON cards (code)');
    app.save(cards);
  },
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    cards.indexes = cards.indexes.filter((index) => !index.includes('idx_cards_code'));
    for (const name of ['code', 'riddle', 'solution']) cards.fields.removeByName(name);
    app.save(cards);
  },
);
