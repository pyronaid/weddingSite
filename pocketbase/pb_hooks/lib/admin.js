/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/admin.pb.js (loaded with require()). */

const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const PHOTO_SUIT = 'hearts';
const RIDDLE_SUIT = 'clubs';
const isFaceCard = (rank) => rank >= 11;

/** Admins are users flagged `is_admin` by a superuser. */
function requireAdmin(e) {
  const auth = e.auth;
  if (!auth || auth.collection().name !== 'users' || !auth.getBool('is_admin')) {
    throw new ForbiddenError('Only the organisers can do this.');
  }
}

function findRecord(app, collection, id, label) {
  try {
    return app.findRecordById(collection, id || '');
  } catch {
    throw new NotFoundError(`${label} not found.`);
  }
}

/** Saves a record, turning validation failures into a 400 with per-field errors. */
function saveOrBadRequest(app, record) {
  try {
    app.save(record);
  } catch (error) {
    // The JS wrapper of a Go validation error keeps the per-field map in `value`.
    throw new BadRequestError('Please check the highlighted values.', (error && error.value) || error);
  }
}

function sceneView(scene) {
  return { id: scene.id, text: scene.getString('text') };
}

function cardView(app, card) {
  const suit = card.getString('suit');
  const rank = card.getInt('rank');
  const view = { id: card.id, suit, rank, letter: card.getString('letter') };
  if (suit === RIDDLE_SUIT) {
    view.riddle = card.getString('riddle');
    view.solution = card.getString('solution');
  }
  if (suit === PHOTO_SUIT && !isFaceCard(rank)) {
    view.scenes = app
      .findRecordsByFilter('photo_scenes', 'card = {:card}', 'created', 0, 0, { card: card.id })
      .map(sceneView);
  }
  return view;
}

function listSuit(app, suit) {
  if (!SUITS.includes(suit)) throw new NotFoundError('Unknown suit.');
  return app.findRecordsByFilter('cards', 'suit = {:suit}', 'rank', 0, 0, { suit }).map((card) => cardView(app, card));
}

/**
 * Updates the editable fields of a card. Only the fields that make sense for
 * the card are accepted: the letter (Ace..10), riddle and solution (clubs).
 */
function updateCard(app, cardId, body) {
  const card = findRecord(app, 'cards', cardId, 'Card');
  const suit = card.getString('suit');
  const rank = card.getInt('rank');

  if (body.letter !== undefined) {
    if (isFaceCard(rank)) throw new BadRequestError('Jack, Queen and King have no letter.');
    card.set('letter', String(body.letter).trim().toUpperCase());
  }
  if (body.riddle !== undefined || body.solution !== undefined) {
    if (suit !== RIDDLE_SUIT) throw new BadRequestError('Only clubs have riddles.');
    if (body.riddle !== undefined) card.set('riddle', String(body.riddle).trim());
    // Stored uppercase without spaces: the same form guests' answers are compared in.
    if (body.solution !== undefined) card.set('solution', String(body.solution).replace(/\s+/g, '').toUpperCase());
  }
  saveOrBadRequest(app, card);
  return cardView(app, card);
}

function photoCard(app, cardId) {
  const card = findRecord(app, 'cards', cardId, 'Card');
  if (card.getString('suit') !== PHOTO_SUIT || isFaceCard(card.getInt('rank'))) {
    throw new BadRequestError('Only the numbered hearts have scenes.');
  }
  return card;
}

function addScene(app, cardId, text) {
  const card = photoCard(app, cardId);
  const scene = new Record(app.findCollectionByNameOrId('photo_scenes'));
  scene.set('card', card.id);
  scene.set('text', String(text || '').trim());
  saveOrBadRequest(app, scene);
  return sceneView(scene);
}

function updateScene(app, sceneId, text) {
  const scene = findRecord(app, 'photo_scenes', sceneId, 'Scene');
  scene.set('text', String(text || '').trim());
  saveOrBadRequest(app, scene);
  return sceneView(scene);
}

/**
 * Deletes a scene. Submissions that drew it keep their own copy of the text
 * (scene_text), so uploaded photos are not affected.
 */
function deleteScene(app, sceneId) {
  app.delete(findRecord(app, 'photo_scenes', sceneId, 'Scene'));
}

module.exports = { requireAdmin, listSuit, updateCard, addScene, updateScene, deleteScene };
