/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/guess.pb.js (loaded with require()). */

const { collect } = require(`${__hooks}/lib/collection.js`);
const { t } = require(`${__hooks}/lib/i18n.js`);

const GUESS_SUIT = 'spades';
const RANKS = 13;
// A real photo, even shrunk to 2048 px, weighs well over 10 KB.
const MIN_PHOTO_BYTES = 10 * 1024;

/**
 * Uppercase letters and digits only, accents folded: "D'Amico" -> "DAMICO",
 * "Nicolò" -> "NICOLO". Names are compared (and their boxes counted) this way.
 */
function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function findGuessCard(app, cardId) {
  let card;
  try {
    card = app.findRecordById('cards', cardId || '');
  } catch {
    throw new NotFoundError(t(app, 'card_not_found'));
  }
  if (card.getString('suit') !== GUESS_SUIT) throw new NotFoundError(t(app, 'no_guess'));
  return card;
}

function findAssignment(app, userId) {
  try {
    return app.findFirstRecordByFilter('guess_assignments', 'user = {:user}', { user: userId });
  } catch {
    return null;
  }
}

/** People with all their hints written: the only ones that can be drawn. */
function playablePeople(app) {
  return app.findRecordsByFilter('guess_people', '', '', 0, 0).filter((person) => {
    const hints = app.findRecordsByFilter('guess_hints', 'person = {:person}', '', 0, 0, { person: person.id });
    return hints.filter((hint) => hint.getString('text').trim()).length >= RANKS;
  });
}

const fullName = (person) => `${person.getString('first_name')} ${person.getString('last_name')}`.trim();

/**
 * The person the user has to find. Drawn at random the first time (never the
 * player themselves, when a guest to find is also playing) and kept forever.
 */
function ensureAssignment(app, auth) {
  const existing = findAssignment(app, auth.id);
  if (existing) return existing;

  const people = playablePeople(app);
  if (people.length === 0) throw new NotFoundError(t(app, 'guess_nobody'));
  const self = normalizeName(auth.getString('name'));
  const others = people.filter((person) => normalizeName(fullName(person)) !== self);
  const pool = others.length > 0 ? others : people;
  const person = pool[Math.floor(Math.random() * pool.length)];

  const assignment = new Record(app.findCollectionByNameOrId('guess_assignments'));
  assignment.set('user', auth.id);
  assignment.set('person', person.id);
  assignment.set('found', false);
  assignment.set('attempts', 0);
  try {
    app.save(assignment);
  } catch (error) {
    // Two first requests at once: the unique index kept the other draw.
    const winner = findAssignment(app, auth.id);
    if (!winner) throw error;
    return winner;
  }
  return assignment;
}

/** The user's selfies of the spades, by card rank. */
function selfiesByRank(app, userId) {
  const cards = app.findRecordsByFilter('cards', 'suit = {:suit}', 'rank', 0, 0, { suit: GUESS_SUIT });
  const rankOf = Object.fromEntries(cards.map((card) => [card.id, card.getInt('rank')]));
  const selfies = app.findRecordsByFilter('guess_selfies', 'user = {:user}', '', 0, 0, { user: userId });
  const byRank = {};
  for (const selfie of selfies) {
    const rank = rankOf[selfie.getString('card')];
    if (rank) byRank[rank] = selfie;
  }
  return { byRank, total: cards.length };
}

/** The selfie holding the photo: itself, or the one it confirmed. */
function photoSelfie(app, selfie) {
  const sourceId = selfie.getString('same_as');
  if (!sourceId) return selfie;
  try {
    return app.findRecordById('guess_selfies', sourceId);
  } catch {
    return selfie; // removed by the organisers: nothing to show
  }
}

function rankOfSelfie(app, selfie) {
  try {
    return app.findRecordById('cards', selfie.getString('card')).getInt('rank');
  } catch {
    return 0;
  }
}

/** What the client needs to build the (protected) photo URL. */
function photoView(app, selfie) {
  const source = photoSelfie(app, selfie);
  return {
    recordId: source.id,
    collectionId: source.collection().id,
    photo: source.getString('photo'),
    takenFor: rankOfSelfie(app, source),
  };
}

const isUnlocked = (rank, byRank) => rank === 1 || Boolean(byRank[rank - 1]);

/**
 * The hints of a card for the user: all of them from the Ace up to this card,
 * the selfie sent for it (if any) and, to confirm "same person as before",
 * the previous card's selfie. Opening the first card draws the person.
 */
function cardView(app, auth, card) {
  const rank = card.getInt('rank');
  const { byRank } = selfiesByRank(app, auth.id);
  if (!isUnlocked(rank, byRank)) return { locked: true, rank };

  const assignment = ensureAssignment(app, auth);
  const hints = app
    .findRecordsByFilter('guess_hints', 'person = {:person} && rank <= {:rank}', 'rank', 0, 0, {
      person: assignment.getString('person'),
      rank,
    })
    .map((hint) => ({ rank: hint.getInt('rank'), text: hint.getString('text') }));

  const own = byRank[rank];
  const previous = rank > 1 ? byRank[rank - 1] : null;
  return {
    locked: false,
    rank,
    hints,
    selfie: own ? { ...photoView(app, own), reused: Boolean(own.getString('same_as')) } : null,
    previous: !own && previous ? photoView(app, previous) : null,
  };
}

/** Checks that the card can take a selfie now; returns the user's selfies. */
function requireOpenCard(app, auth, card) {
  const rank = card.getInt('rank');
  const state = selfiesByRank(app, auth.id);
  if (!isUnlocked(rank, state.byRank)) {
    throw new BadRequestError(t(app, 'guess_locked'));
  }
  if (!findAssignment(app, auth.id)) throw new BadRequestError(t(app, 'guess_open_first'));
  return state;
}

/** Saves the selfie and collects the card, together. */
function saveSelfie(app, auth, card, fill) {
  app.runInTransaction((txApp) => {
    const selfie = new Record(txApp.findCollectionByNameOrId('guess_selfies'));
    selfie.set('user', auth.id);
    selfie.set('card', card.id);
    fill(selfie);
    try {
      txApp.save(selfie);
    } catch (error) {
      throw new BadRequestError(t(txApp, 'selfie_invalid'), (error && error.value) || error);
    }
    collect(txApp, auth.id, card.id);
  });
}

/** A new selfie for the card. A card's selfie cannot be changed once sent. */
function uploadSelfie(app, auth, card, files) {
  const { byRank } = requireOpenCard(app, auth, card);
  if (byRank[card.getInt('rank')]) return cardView(app, auth, card); // double submit: already there
  if (!files || files.length === 0) throw new BadRequestError(t(app, 'selfie_missing'));
  if (files[0].size < MIN_PHOTO_BYTES) throw new BadRequestError(t(app, 'photo_too_small'));
  saveSelfie(app, auth, card, (selfie) => selfie.set('photo', files[0]));
  return cardView(app, auth, card);
}

/** "Same person as before": the previous card's selfie counts for this one too. */
function confirmPrevious(app, auth, card) {
  const rank = card.getInt('rank');
  const { byRank } = requireOpenCard(app, auth, card);
  if (byRank[rank]) return cardView(app, auth, card);
  if (rank === 1) throw new BadRequestError(t(app, 'selfie_ace'));
  const source = photoSelfie(app, byRank[rank - 1]);
  saveSelfie(app, auth, card, (selfie) => selfie.set('same_as', source.id));
  return cardView(app, auth, card);
}

/**
 * Where the player stands: whether the person was drawn, all the selfies
 * sent (the guess opens), the number of letters of the name and surname
 * (one box each) and, once found, who it was.
 */
function status(app, userId) {
  const assignment = findAssignment(app, userId);
  const { byRank, total } = selfiesByRank(app, userId);
  const complete = total > 0 && Object.keys(byRank).length >= total;
  if (!assignment) return { assigned: false, complete: false, found: false, name: null, lengths: null };

  const person = app.findRecordById('guess_people', assignment.getString('person'));
  const found = assignment.getBool('found');
  return {
    assigned: true,
    complete,
    found,
    name: found ? fullName(person) : null,
    lengths:
      complete && !found
        ? {
            firstName: normalizeName(person.getString('first_name')).length,
            lastName: normalizeName(person.getString('last_name')).length,
          }
        : null,
  };
}

/** The final guess, once every card has its selfie. Unlimited attempts. */
function solve(app, userId, body) {
  const current = status(app, userId);
  if (current.found) return { correct: true, name: current.name };
  if (!current.complete) throw new BadRequestError(t(app, 'guess_too_early'));

  const assignment = findAssignment(app, userId);
  const person = app.findRecordById('guess_people', assignment.getString('person'));
  const correct =
    normalizeName(body.firstName) === normalizeName(person.getString('first_name')) &&
    normalizeName(body.lastName) === normalizeName(person.getString('last_name'));

  assignment.set('attempts', assignment.getInt('attempts') + 1);
  if (correct) assignment.set('found', true);
  app.save(assignment);
  return { correct, name: correct ? fullName(person) : null };
}

module.exports = { findGuessCard, cardView, uploadSelfie, confirmPrevious, status, solve, normalizeName, RANKS };
