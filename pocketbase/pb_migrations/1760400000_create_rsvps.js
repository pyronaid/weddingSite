/// <reference path="../pb_data/types.d.ts" />

/**
 * RSVP collection.
 * Security model: anyone may CREATE (the public confirmation form), nobody
 * but superusers may list/view/update/delete (rules set to null).
 */
migrate(
  (app) => {
    const collection = new Collection({
      type: 'base',
      name: 'rsvps',
      listRule: null,
      viewRule: null,
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'full_name', type: 'text', required: true, min: 1, max: 120, presentable: true },
        { name: 'email', type: 'email', required: true },
        // Note: a "required" bool must be true in PocketBase, so it stays optional.
        { name: 'attending', type: 'bool' },
        { name: 'guests', type: 'number', min: 0, max: 10, onlyInt: true },
        { name: 'dietary_notes', type: 'text', max: 500 },
        { name: 'message', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_rsvps_email ON rsvps (email)'],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('rsvps');
    app.delete(collection);
  },
);
