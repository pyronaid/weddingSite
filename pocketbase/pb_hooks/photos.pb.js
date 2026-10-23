/// <reference path="../pb_data/types.d.ts" />

/**
 * Photo challenge (hearts).
 *
 *   POST /api/game/photos/{cardId}/draw
 *     No photo uploaded yet: draws a random scene from the card's bucket (a
 *     new one on every call, so it cannot be prepared in advance) and stores
 *     it as the user's pending scene. Photo already uploaded: the scene is
 *     locked and returned unchanged, so only the photo can be replaced.
 *
 * The photo itself is uploaded with the standard records API (update of the
 * user's own photo_submissions row, restricted by its updateRule); the hooks
 * below make sure a photo is present and collect the card.
 */

routerAdd(
  'POST',
  '/api/game/photos/{cardId}/draw',
  (e) => {
    const photos = require(`${__hooks}/lib/photos.js`);
    const card = photos.findPhotoCard(e.app, e.request.pathValue('cardId'));
    const submission = photos.drawScene(e.app, e.auth, card);
    return e.json(200, photos.toDrawResponse(submission));
  },
  $apis.requireAuth('users'),
);

// Uploading (or replacing) the photo must leave a real photo in place.
// The file field already checks the type from the file CONTENT (JPEG, PNG or
// WebP; a renamed text/SVG/GIF file is rejected) and the 10 MB limit.
// Superusers may remove a photo from the admin UI (moderation).
onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next();
  const { t } = require(`${__hooks}/lib/i18n.js`);

  // A just-uploaded file is still pending here.
  const uploaded = e.record.getUnsavedFiles('photo');
  if (!e.record.getString('photo') && uploaded.length === 0) {
    throw new BadRequestError(t(e.app, 'photo_missing'));
  }
  // A real photo, even shrunk to 2048 px, weighs well over 10 KB: this rejects
  // icons, 1x1 pixels and empty images.
  const MIN_BYTES = 10 * 1024;
  if (uploaded.length > 0 && uploaded[0].size < MIN_BYTES) {
    throw new BadRequestError(t(e.app, 'photo_too_small'));
  }
  e.next();
}, 'photo_submissions');

// A stored photo collects the card.
onRecordAfterUpdateSuccess((e) => {
  if (e.record.getString('photo')) {
    const { collect } = require(`${__hooks}/lib/collection.js`);
    collect(e.app, e.record.getString('user'), e.record.getString('card'));
  }
  e.next();
}, 'photo_submissions');
