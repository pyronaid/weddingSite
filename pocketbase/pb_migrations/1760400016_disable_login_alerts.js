/// <reference path="../pb_data/types.d.ts" />

/**
 * No "new login to your account" e-mails: guests log in from their phones and
 * computers all through the wedding, and the alert only worries them. (The
 * other e-mails are designed in pb_hooks/lib/emails.js.)
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authAlert.enabled = false;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.authAlert.enabled = true;
    app.save(users);
  },
);
