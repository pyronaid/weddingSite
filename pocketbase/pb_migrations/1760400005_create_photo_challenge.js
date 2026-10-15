/// <reference path="../pb_data/types.d.ts" />

/**
 * Photo challenge (hearts): every numbered card has a bucket of scenes to
 * photograph; harder scenes for higher cards. Jack, Queen and King scenes are
 * told in person, so they need no bucket.
 *
 * - `photo_scenes`: the buckets. Admin only: guests get a scene only through
 *   pb_hooks/photos.pb.js, one random draw at a time.
 * - `photo_submissions`: one row per (user, card) with the drawn scene and,
 *   once uploaded, the photo. Created/redrawn only by the hook. The owner may
 *   update the photo and nothing else (see updateRule); every logged-in user
 *   can see submissions that have a photo (the gallery).
 */
const SCENES = {
  1: ['A toast with your glass raised next to the bride', 'Someone wearing the groom\'s jacket', 'Two guests clinking glasses'],
  2: ['A guest showing off their shoes', 'Someone laughing out loud', 'The wedding cake (before it is cut!)'],
  3: ['Three guests making the same funny face', 'Someone with a flower behind their ear', 'A guest holding two glasses at once'],
  4: ['Four people in a human pyramid (or trying)', 'A waiter carrying a full tray', 'Someone hugging a guest they just met'],
  5: ['The bride\'s mother wearing sunglasses', 'A group selfie with at least five people', 'Someone dancing barefoot'],
  6: ['The groom\'s father telling a joke', 'Two guests swapping their jackets', 'Someone giving a piggyback ride'],
  7: ['Seven people forming a heart with their arms', 'A guest asleep on a chair', 'The best man on the dance floor'],
  8: ['The groom dancing with at least three girls', 'Somebody wearing the bride\'s veil (with permission!)', 'Eight hands on one glass'],
  9: ['The bride and the groom kissing in the background of your selfie', 'A conga line of at least nine people', 'A grandparent showing a dance move'],
  10: ['The whole wedding party jumping in the air', 'The bride throwing the bouquet', 'Ten guests spelling a word with their bodies'],
};

migrate(
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    const users = app.findCollectionByNameOrId('users');

    const scenes = new Collection({
      type: 'base',
      name: 'photo_scenes',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        { name: 'text', type: 'text', required: true, max: 300, presentable: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_photo_scenes_card ON photo_scenes (card)'],
    });
    app.save(scenes);

    const submissions = new Collection({
      type: 'base',
      name: 'photo_submissions',
      // The gallery: every logged-in user sees the uploaded photos.
      listRule: '@request.auth.id != "" && photo != ""',
      viewRule: '@request.auth.id != "" && photo != ""',
      createRule: null,
      // The owner can only replace the photo: the drawn scene stays locked.
      updateRule: [
        'user = @request.auth.id',
        '@request.body.user:isset = false',
        '@request.body.card:isset = false',
        '@request.body.scene:isset = false',
        '@request.body.scene_text:isset = false',
        '@request.body.player:isset = false',
      ].join(' && '),
      deleteRule: null,
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        // Empty for Jack, Queen and King (told in person).
        { name: 'scene', type: 'relation', maxSelect: 1, collectionId: scenes.id, cascadeDelete: false },
        // Snapshot of the scene text, so editing a scene never rewrites history.
        { name: 'scene_text', type: 'text', required: true, max: 300 },
        // First name shown in the gallery (users cannot read each other's records).
        { name: 'player', type: 'text', max: 60 },
        {
          name: 'photo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          // Grid thumbnails and the enlarged view: generated once, then cached.
          thumbs: ['480x0', '1200x0'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_photo_submissions_user_card ON photo_submissions (user, card)',
        // The gallery lists and polls by most recent update.
        'CREATE INDEX idx_photo_submissions_updated ON photo_submissions (updated)',
      ],
    });
    app.save(submissions);

    // Starter scenes for the numbered hearts: edit them freely in the admin UI.
    for (const [rank, texts] of Object.entries(SCENES)) {
      const card = app.findFirstRecordByFilter('cards', 'suit = "hearts" && rank = {:rank}', { rank: Number(rank) });
      for (const text of texts) {
        const record = new Record(scenes);
        record.set('card', card.id);
        record.set('text', text);
        app.save(record);
      }
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('photo_submissions'));
    app.delete(app.findCollectionByNameOrId('photo_scenes'));
  },
);
