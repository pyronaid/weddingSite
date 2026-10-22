/// <reference path="../pb_data/types.d.ts" />

/**
 * Site content edited by the super admin from the site, instead of the code.
 *
 * - `users.is_superadmin`: the bride and groom (or whoever they trust). Like
 *   `is_admin`, only a superuser can grant it (admin UI); users can never set
 *   it themselves. A super admin is also an organiser.
 * - `site_content`: ONE record with the language of the site, the names,
 *   date, venues, RSVP deadline and gift details. Anyone can read it (it is
 *   the public wedding page); only super admins can update it, nobody can
 *   create or delete it (pb_hooks/site.pb.js validates it).
 * - `site_photos`: one record per photo slot ("hero", "date-left-1",
 *   "area-3"...). A slot without a record shows the default picture shipped
 *   in /public/images. Public read, super admins write.
 */
const SUPERADMIN = '@request.auth.id != "" && @request.auth.is_superadmin = true';
const OWNER_OR_ORGANISER =
  '@request.auth.id != "" && (user = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_superadmin = true)';

// The content the site shipped with: change it from the site afterwards.
const DEFAULTS = {
  language: 'en',
  partner_one: 'Giulia',
  partner_two: 'Marco',
  hashtag: '#GiuliaEMarco',
  tagline: 'We are getting married',
  date: '2027-06-19T16:00:00+02:00',
  timezone: 'Europe/Rome',
  rsvp_deadline: '2027-04-30',
  ceremony_name: 'Chiesa di San Pietro',
  ceremony_address: 'Piazza San Pietro 1, 00120 Roma',
  ceremony_time: '16:00',
  ceremony_map: 'Piazza San Pietro, Roma',
  reception_name: 'Villa dei Fiori',
  reception_address: 'Via dei Fiori 10, 00100 Roma',
  reception_time: '19:00',
  reception_map: 'Villa Borghese, Roma',
  gift_message:
    'Your presence is the most beautiful gift. If you would like to help us start our new life together, you can contribute to our honeymoon.',
  account_holder: 'Giulia Rossi & Marco Bianchi',
  iban: 'IT60X0542811101000000123456',
  bic: 'BPMOIT22XXX',
  bank_name: 'Banca Esempio',
  payment_reason: 'Wedding gift Giulia & Marco',
};

const text = (name, max, extra = {}) => ({ name, type: 'text', max, ...extra });
const TIME = '^([01][0-9]|2[0-3]):[0-5][0-9]$';

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.add(new BoolField({ name: 'is_superadmin' }));
    users.createRule = '@request.body.is_admin:isset = false && @request.body.is_superadmin:isset = false';
    users.updateRule =
      'id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.is_superadmin:isset = false';
    app.save(users);

    // Super admins check the selfies of the winner too, like the organisers.
    const selfies = app.findCollectionByNameOrId('guess_selfies');
    selfies.listRule = selfies.viewRule = OWNER_OR_ORGANISER;
    app.save(selfies);

    const content = new Collection({
      type: 'base',
      name: 'site_content',
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: SUPERADMIN,
      deleteRule: null,
      fields: [
        { name: 'language', type: 'select', required: true, maxSelect: 1, values: ['en', 'it'] },
        text('partner_one', 60, { required: true }),
        text('partner_two', 60, { required: true }),
        text('hashtag', 60),
        text('tagline', 120),
        // ISO-8601 with the UTC offset, so the countdown is right everywhere.
        text('date', 40, { required: true }),
        // Where the wedding takes place: dates and times are shown in it.
        text('timezone', 60, { required: true }),
        text('rsvp_deadline', 10, { required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
        text('ceremony_name', 120, { required: true }),
        text('ceremony_address', 200, { required: true }),
        text('ceremony_time', 5, { required: true, pattern: TIME }),
        // Optional search text for the map; the address is used when empty.
        text('ceremony_map', 200),
        // The reception is shown only when it has a name.
        text('reception_name', 120),
        text('reception_address', 200),
        text('reception_time', 5, { pattern: TIME }),
        text('reception_map', 200),
        text('gift_message', 1000),
        text('account_holder', 120, { required: true }),
        text('iban', 42, { required: true }),
        text('bic', 11),
        text('bank_name', 120),
        text('payment_reason', 140),
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(content);

    const record = new Record(content);
    for (const [key, value] of Object.entries(DEFAULTS)) record.set(key, value);
    app.save(record);

    const photos = new Collection({
      type: 'base',
      name: 'site_photos',
      listRule: '',
      viewRule: '',
      createRule: SUPERADMIN,
      updateRule: SUPERADMIN,
      deleteRule: SUPERADMIN,
      fields: [
        // Checked against the known slots in pb_hooks/site.pb.js.
        text('slot', 20, { required: true, pattern: '^[a-z0-9-]+$', presentable: true }),
        {
          name: 'image',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          // The big photo at the top, and the smaller ones around the sections.
          thumbs: ['1600x0', '800x0'],
        },
        // Description for screen readers (empty for purely decorative photos).
        text('alt', 200),
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_site_photos_slot ON site_photos (slot)'],
    });
    app.save(photos);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('site_photos'));
    app.delete(app.findCollectionByNameOrId('site_content'));
    const selfies = app.findCollectionByNameOrId('guess_selfies');
    selfies.listRule = selfies.viewRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.is_admin = true)';
    app.save(selfies);
    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('is_superadmin');
    users.createRule = '@request.body.is_admin:isset = false';
    users.updateRule = 'id = @request.auth.id && @request.body.is_admin:isset = false';
    app.save(users);
  },
);
