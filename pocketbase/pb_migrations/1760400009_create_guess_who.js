/// <reference path="../pb_data/types.d.ts" />

/**
 * "Guess who" (spades): every player is secretly given a person to find.
 * Each card, from the Ace to the King, reveals one more hint about that
 * person; a selfie with a guest who matches the hints so far collects the
 * card and unlocks the next one. After the King, the player types the
 * person's name and surname.
 *
 * - `guess_people`: the people to find (name and surname). Organisers only.
 * - `guess_hints`: their 13 hints, one per card rank. Organisers only.
 * - `guess_assignments`: the person drawn for each user, the first time they
 *   open the Ace, kept for the whole game; `found` once guessed. Server only.
 * - `guess_selfies`: one row per (user, card). Either a photo, or `same_as`
 *   the earlier selfie the player confirmed ("same person as before"),
 *   always pointing at the selfie that holds the photo. Created only by
 *   pb_hooks/guess.pb.js; the owner (and the organisers) can view them.
 */
const RANKS = 13;

// Starter people: replace them from the organisers' view (they are visible in this repository).
const PEOPLE = [
  {
    firstName: 'Mario',
    lastName: 'Rossi',
    hints: [
      'Wears glasses or contact lenses',
      'Is taller than 175 cm',
      'Has dark hair',
      'Is wearing something blue',
      'Has known the groom for more than 10 years',
      'Loves football',
      'Has a brother or a sister',
      'Has been to Spain',
      'Drinks coffee every morning',
      'Lives in a different city from the bride and groom',
      'Can play a musical instrument',
      'Has a pet',
      'Was born in spring',
    ],
  },
  {
    firstName: 'Giulia',
    lastName: 'Bianchi',
    hints: [
      'Has long hair',
      'Is shorter than 170 cm',
      'Is wearing earrings',
      'Has known the bride since school',
      'Likes dancing',
      'Speaks at least two languages',
      'Has travelled outside Europe',
      'Prefers the sea to the mountains',
      'Is a good cook',
      'Has a driving licence',
      'Has read more than 10 books this year',
      'Is wearing something green',
      'Was born in autumn',
    ],
  },
];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const cards = app.findCollectionByNameOrId('cards');

    const people = new Collection({
      type: 'base',
      name: 'guess_people',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'first_name', type: 'text', required: true, max: 60, presentable: true },
        { name: 'last_name', type: 'text', required: true, max: 60, presentable: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(people);

    const hints = new Collection({
      type: 'base',
      name: 'guess_hints',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'person', type: 'relation', required: true, maxSelect: 1, collectionId: people.id, cascadeDelete: true },
        // The card that reveals it: 1 = Ace ... 13 = King.
        { name: 'rank', type: 'number', required: true, min: 1, max: RANKS, onlyInt: true },
        { name: 'text', type: 'text', required: true, max: 300 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_guess_hints_person_rank ON guess_hints (person, rank)'],
    });
    app.save(hints);

    const assignments = new Collection({
      type: 'base',
      name: 'guess_assignments',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        // No cascade: a person assigned to a player cannot be deleted.
        { name: 'person', type: 'relation', required: true, maxSelect: 1, collectionId: people.id, cascadeDelete: false },
        { name: 'found', type: 'bool' },
        { name: 'attempts', type: 'number', min: 0, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_guess_assignments_user ON guess_assignments (user)'],
    });
    app.save(assignments);

    // The owner and the organisers (who check the selfies of the winner).
    const ownerOrAdmin = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.is_admin = true)';
    const selfies = new Collection({
      type: 'base',
      name: 'guess_selfies',
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['480x0'],
          // Like the hearts photos: a URL works only with a file token.
          protected: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_guess_selfies_user_card ON guess_selfies (user, card)'],
    });
    app.save(selfies);
    // Self-relation: added once the collection has an id.
    selfies.fields.add(
      new RelationField({ name: 'same_as', maxSelect: 1, collectionId: selfies.id, cascadeDelete: false }),
    );
    app.save(selfies);

    for (const person of PEOPLE) {
      const record = new Record(people);
      record.set('first_name', person.firstName);
      record.set('last_name', person.lastName);
      app.save(record);
      person.hints.forEach((text, index) => {
        const hint = new Record(hints);
        hint.set('person', record.id);
        hint.set('rank', index + 1);
        hint.set('text', text);
        app.save(hint);
      });
    }
  },
  (app) => {
    for (const name of ['guess_selfies', 'guess_assignments', 'guess_hints', 'guess_people']) {
      app.delete(app.findCollectionByNameOrId(name));
    }
  },
);
