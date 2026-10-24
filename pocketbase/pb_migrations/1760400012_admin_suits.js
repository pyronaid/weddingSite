/// <reference path="../pb_data/types.d.ts" />

/**
 * Organisers per suit: `users.is_admin` (yes/no) becomes `users.admin_suits`,
 * the list of suits a user edits (hearts, diamonds, spades, clubs). A clubs
 * organiser edits only the clubs, and plays the game like every guest.
 *
 * Former organisers keep every suit. Super admins (`is_superadmin`) still
 * edit everything. Only a superuser can set either field (admin UI): the
 * rules stop users from setting them at sign-up or on their own record.
 */
const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];

const SELF_SERVICE_GUARD = '@request.body.admin_suits:isset = false && @request.body.is_superadmin:isset = false';
// The winner's selfies are checked by the spades organisers and the super admins.
const SELFIES_VIEW =
  '@request.auth.id != "" && (user = @request.auth.id || @request.auth.admin_suits:each ?= "spades" || @request.auth.is_superadmin = true)';

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.add(new SelectField({ name: 'admin_suits', maxSelect: SUITS.length, values: SUITS }));
    app.save(users);

    for (const user of app.findRecordsByFilter('users', 'is_admin = true', '', 0, 0)) {
      user.set('admin_suits', SUITS);
      app.saveNoValidate(user);
    }

    users.fields.removeByName('is_admin');
    users.createRule = SELF_SERVICE_GUARD;
    users.updateRule = `id = @request.auth.id && ${SELF_SERVICE_GUARD}`;
    app.save(users);

    const selfies = app.findCollectionByNameOrId('guess_selfies');
    selfies.listRule = selfies.viewRule = SELFIES_VIEW;
    app.save(selfies);
  },
  (app) => {
    const selfies = app.findCollectionByNameOrId('guess_selfies');
    selfies.listRule = selfies.viewRule =
      '@request.auth.id != "" && (user = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_superadmin = true)';

    const users = app.findCollectionByNameOrId('users');
    users.fields.add(new BoolField({ name: 'is_admin' }));
    users.createRule = '@request.body.is_admin:isset = false && @request.body.is_superadmin:isset = false';
    users.updateRule =
      'id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.is_superadmin:isset = false';
    app.save(users);
    // Before admin_suits goes away: no rule may still use it.
    app.save(selfies);

    // An organiser of any suit becomes an organiser again.
    for (const user of app.findRecordsByFilter('users', "admin_suits != ''", '', 0, 0)) {
      user.set('is_admin', true);
      app.saveNoValidate(user);
    }
    users.fields.removeByName('admin_suits');
    app.save(users);
  },
);
