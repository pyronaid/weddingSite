/// <reference path="../pb_data/types.d.ts" />

/**
 * Admins and the sign-up secret code.
 *
 * - `users.is_admin`: organisers who edit the game content from the site
 *   (letters, riddles, scenes, secret code) through /api/admin/*. Only a
 *   superuser can grant it (admin UI): the rules below stop users from
 *   setting it at sign-up or on their own record.
 * - `app_settings`: key/value settings editable by admins from the site.
 *   `signup_code` is the secret code required to create an account
 *   (pb_hooks/signup.pb.js); an empty value disables the check.
 *   Superusers/hooks only: never readable through the API.
 */
const DEFAULT_SIGNUP_CODE = '#wedding';

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.add(new BoolField({ name: 'is_admin' }));
    users.createRule = '@request.body.is_admin:isset = false';
    users.updateRule = 'id = @request.auth.id && @request.body.is_admin:isset = false';
    app.save(users);

    const settings = new Collection({
      type: 'base',
      name: 'app_settings',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'key', type: 'text', required: true, max: 50, pattern: '^[a-z_]+$', presentable: true },
        { name: 'value', type: 'text', max: 200 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_app_settings_key ON app_settings (key)'],
    });
    app.save(settings);

    const signupCode = new Record(settings);
    signupCode.set('key', 'signup_code');
    signupCode.set('value', DEFAULT_SIGNUP_CODE);
    app.save(signupCode);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('app_settings'));
    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('is_admin');
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    app.save(users);
  },
);
