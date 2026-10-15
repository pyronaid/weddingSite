/// <reference path="../pb_data/types.d.ts" />

/**
 * Photo challenge files are protected: a photo URL works only with a file
 * token, which PocketBase gives to logged-in users (POST /api/files/token).
 * A leaked link stops working when its token expires.
 *
 * File tokens last 1 hour instead of 3 minutes, so a gallery left open at the
 * venue keeps working; the frontend renews the token before it expires.
 */
const FILE_TOKEN_SECONDS = 3600;

migrate(
  (app) => {
    const submissions = app.findCollectionByNameOrId('photo_submissions');
    submissions.fields.getByName('photo').protected = true;
    app.save(submissions);

    const users = app.findCollectionByNameOrId('users');
    users.fileToken.duration = FILE_TOKEN_SECONDS;
    app.save(users);
  },
  (app) => {
    const submissions = app.findCollectionByNameOrId('photo_submissions');
    submissions.fields.getByName('photo').protected = false;
    app.save(submissions);

    const users = app.findCollectionByNameOrId('users');
    users.fileToken.duration = 180;
    app.save(users);
  },
);
