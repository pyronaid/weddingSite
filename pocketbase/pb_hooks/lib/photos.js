/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/photos.pb.js (loaded with require()). */

const PHOTO_SUIT = 'hearts';
const FACE_NAMES = { 11: 'Jack', 12: 'Queen', 13: 'King' };

/** The hearts card for a draw, or a 404. */
function findPhotoCard(app, cardId) {
  let card;
  try {
    card = app.findRecordById('cards', cardId || '');
  } catch {
    throw new NotFoundError('Card not found.');
  }
  if (card.getString('suit') !== PHOTO_SUIT) throw new NotFoundError('This card has no photo challenge.');
  return card;
}

function findSubmission(app, userId, cardId) {
  try {
    return app.findFirstRecordByFilter('photo_submissions', 'user = {:user} && card = {:card}', {
      user: userId,
      card: cardId,
    });
  } catch {
    return null;
  }
}

/** Random scene of the card's bucket, avoiding `excludeId` when there is a choice. */
function pickScene(app, cardId, excludeId) {
  const scenes = app.findRecordsByFilter('photo_scenes', 'card = {:card}', '', 0, 0, { card: cardId });
  if (scenes.length === 0) throw new NotFoundError('No scenes for this card yet.');
  const pool = scenes.length > 1 ? scenes.filter((scene) => scene.id !== excludeId) : scenes;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Draws (or, once a photo exists, keeps) the user's scene for a card. */
function drawScene(app, auth, card) {
  let submission = findSubmission(app, auth.id, card.id);
  if (submission && submission.getString('photo')) return submission; // locked

  if (!submission) {
    submission = new Record(app.findCollectionByNameOrId('photo_submissions'));
    submission.set('user', auth.id);
    submission.set('card', card.id);
  }
  // First name only: it is shown to every guest in the gallery.
  submission.set('player', (auth.getString('name').trim().split(/\s+/)[0] || 'A guest').slice(0, 60));

  const face = FACE_NAMES[card.getInt('rank')];
  if (face) {
    submission.set('scene', '');
    submission.set('scene_text', `The ${face} of hearts will tell you the scene in person: go and find them!`);
  } else {
    const scene = pickScene(app, card.id, submission.getString('scene'));
    submission.set('scene', scene.id);
    submission.set('scene_text', scene.getString('text'));
  }
  app.save(submission);
  return submission;
}

function toDrawResponse(submission) {
  const photo = submission.getString('photo');
  return {
    submissionId: submission.id,
    collectionId: submission.collection().id,
    scene: submission.getString('scene_text'),
    locked: Boolean(photo),
    photo,
  };
}

module.exports = { findPhotoCard, drawScene, toDrawResponse };
