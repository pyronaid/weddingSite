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

// Uploading (or replacing) the photo must leave a photo in place.
// Superusers may remove one from the admin UI (moderation).
onRecordUpdateRequest((e) => {
  // A just-uploaded file is still pending here: count it as well.
  const hasPhoto = e.record.getString('photo') || e.record.getUnsavedFiles('photo').length > 0;
  if (!e.hasSuperuserAuth() && !hasPhoto) {
    throw new BadRequestError('Please choose a photo to upload.');
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
