/// <reference path="../pb_data/types.d.ts" />

/**
 * The super admins' print designs (Site settings → Prints), saved as they
 * edit them so they can go on from any browser or computer: the choices of
 * the logo designer, of the invitation designer, and the website address in
 * the QR codes. One record per kind; `design` holds the form's choices (the
 * pictures are always drawn again from them).
 *
 * No API rules: only pb_hooks/admin.pb.js reads and writes them, for super
 * admins.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const collection = new Collection({
      type: 'base',
      name: 'print_designs',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'kind', type: 'text', required: true, max: 20, pattern: '^[a-z]+$', presentable: true },
        { name: 'design', type: 'json', maxSize: 20000 },
        // Who saved it last (kept when that user is deleted: the design stays).
        { name: 'updated_by', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_print_designs_kind ON print_designs (kind)'],
    });
    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('print_designs'));
  },
);
