/// <reference path="../pb_data/types.d.ts" />

/**
 * Hardens the built-in "users" auth collection for the private area:
 * - public sign-up stays enabled (createRule = "")
 * - only users who confirmed their e-mail can log in (authRule)
 * - users cannot delete their own account from the API (superusers can)
 * The e-mail templates are managed by pb_hooks/settings.pb.js because their
 * links depend on the FRONTEND_URL environment variable.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.createRule = '';
    users.authRule = 'verified = true';
    users.deleteRule = null;
    users.passwordAuth.enabled = true;
    users.passwordAuth.identityFields = ['email'];

    const password = users.fields.getByName('password');
    password.min = 8;

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authRule = '';
    users.deleteRule = 'id = @request.auth.id';
    app.save(users);
  },
);
