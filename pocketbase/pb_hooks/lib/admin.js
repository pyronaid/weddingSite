/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/admin.pb.js (loaded with require()). */

const { t } = require(`${__hooks}/lib/i18n.js`);

const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const PHOTO_SUIT = 'hearts';
const RIDDLE_SUIT = 'clubs';
const QUIZ_SUIT = 'diamonds';
const GUESS_SUIT = 'spades';
const MIN_ANSWERS = 2;
const isFaceCard = (rank) => rank >= 11;

/**
 * The suits a user organises: the ones in `admin_suits`, set by a superuser;
 * every suit for a super admin (`is_superadmin`).
 */
function adminSuitsOf(auth) {
  if (!auth || auth.collection().name !== 'users') return [];
  if (auth.getBool('is_superadmin')) return SUITS;
  return auth.getStringSlice('admin_suits').filter((suit) => SUITS.includes(suit));
}

/** Organisers of at least one suit, and super admins. */
function requireOrganiser(e) {
  if (adminSuitsOf(e.auth).length === 0) throw new ForbiddenError(t(e.app, 'admins_only'));
}

/** The organisers of `suit`, and super admins. */
function requireSuitAdmin(e, suit) {
  requireOrganiser(e);
  if (!adminSuitsOf(e.auth).includes(suit)) throw new ForbiddenError(t(e.app, 'suit_admins_only'));
}

/** Super admins only (settings that are not about one suit, e.g. the sign-up code). */
function requireSuperAdmin(e) {
  const auth = e.auth;
  if (!auth || auth.collection().name !== 'users' || !auth.getBool('is_superadmin')) {
    throw new ForbiddenError(t(e.app, 'superadmins_only'));
  }
}

/** The suit of a card, or of the scene, quiz question or answer it holds. */
function suitOf(app, kind, id) {
  if (kind === 'card') return findRecord(app, 'cards', id).getString('suit');
  if (kind === 'scene') return suitOf(app, 'card', findRecord(app, 'photo_scenes', id).getString('card'));
  if (kind === 'question') return suitOf(app, 'card', findRecord(app, 'quiz_questions', id).getString('card'));
  if (kind === 'answer') return suitOf(app, 'question', findRecord(app, 'quiz_answers', id).getString('question'));
  throw new Error(`Unknown kind ${kind}`);
}

/**
 * The organisers of the suit `id` belongs to. Non-organisers are refused
 * before anything is looked up, so they cannot probe which ids exist.
 */
function requireAdminOf(e, kind, id) {
  requireOrganiser(e);
  requireSuitAdmin(e, suitOf(e.app, kind, id));
}

function findRecord(app, collection, id) {
  try {
    return app.findRecordById(collection, id || '');
  } catch {
    throw new NotFoundError(t(app, 'not_found'));
  }
}

/** Saves a record, turning validation failures into a 400 with per-field errors. */
function saveOrBadRequest(app, record) {
  try {
    app.save(record);
  } catch (error) {
    // The JS wrapper of a Go validation error keeps the per-field map in `value`.
    throw new BadRequestError(t(app, 'check_fields'), (error && error.value) || error);
  }
}

function sceneView(scene) {
  return { id: scene.id, text: scene.getString('text') };
}

function answerView(answer) {
  return { id: answer.id, text: answer.getString('text'), correct: answer.getBool('correct') };
}

function questionView(app, question) {
  return {
    id: question.id,
    text: question.getString('text'),
    answers: app
      .findRecordsByFilter('quiz_answers', 'question = {:question}', 'created', 0, 0, { question: question.id })
      .map(answerView),
  };
}

function cardView(app, card) {
  const suit = card.getString('suit');
  const rank = card.getInt('rank');
  const view = { id: card.id, suit, rank, letter: card.getString('letter') };
  if (suit === RIDDLE_SUIT) {
    view.riddle = card.getString('riddle');
    view.solution = card.getString('solution');
  }
  if (suit === QUIZ_SUIT) {
    view.questions = app
      .findRecordsByFilter('quiz_questions', 'card = {:card}', 'created', 0, 0, { card: card.id })
      .map((question) => questionView(app, question));
  }
  if (suit === PHOTO_SUIT && !isFaceCard(rank)) {
    view.scenes = app
      .findRecordsByFilter('photo_scenes', 'card = {:card}', 'created', 0, 0, { card: card.id })
      .map(sceneView);
  }
  return view;
}

function listSuit(app, suit) {
  if (!SUITS.includes(suit)) throw new NotFoundError(t(app, 'unknown_suit'));
  return app.findRecordsByFilter('cards', 'suit = {:suit}', 'rank', 0, 0, { suit }).map((card) => cardView(app, card));
}

/**
 * Updates the editable fields of a card. Only the fields that make sense for
 * the card are accepted: the letter (Ace..10, not spades), riddle and solution (clubs).
 */
function updateCard(app, cardId, body) {
  const card = findRecord(app, 'cards', cardId);
  const suit = card.getString('suit');
  const rank = card.getInt('rank');

  if (body.letter !== undefined) {
    if (isFaceCard(rank)) throw new BadRequestError(t(app, 'face_no_letter'));
    if (suit === GUESS_SUIT) throw new BadRequestError(t(app, 'spades_no_letter'));
    card.set('letter', String(body.letter).trim().toUpperCase());
  }
  if (body.riddle !== undefined || body.solution !== undefined) {
    if (suit !== RIDDLE_SUIT) throw new BadRequestError(t(app, 'clubs_only'));
    if (body.riddle !== undefined) card.set('riddle', String(body.riddle).trim());
    // Stored uppercase without spaces: the same form guests' answers are compared in.
    if (body.solution !== undefined) card.set('solution', String(body.solution).replace(/\s+/g, '').toUpperCase());
  }
  saveOrBadRequest(app, card);
  return cardView(app, card);
}

function photoCard(app, cardId) {
  const card = findRecord(app, 'cards', cardId);
  if (card.getString('suit') !== PHOTO_SUIT || isFaceCard(card.getInt('rank'))) {
    throw new BadRequestError(t(app, 'hearts_only'));
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
  const scene = findRecord(app, 'photo_scenes', sceneId);
  scene.set('text', String(text || '').trim());
  saveOrBadRequest(app, scene);
  return sceneView(scene);
}

/**
 * Deletes a scene. Submissions that drew it keep their own copy of the text
 * (scene_text), so uploaded photos are not affected.
 */
function deleteScene(app, sceneId) {
  app.delete(findRecord(app, 'photo_scenes', sceneId));
}

// ---- Quiz (diamonds) ----

const cleanText = (value) => String(value ?? '').trim();

function quizCard(app, cardId) {
  const card = findRecord(app, 'cards', cardId);
  if (card.getString('suit') !== QUIZ_SUIT) throw new BadRequestError(t(app, 'diamonds_only'));
  return card;
}

function siblings(app, questionId) {
  return app.findRecordsByFilter('quiz_answers', 'question = {:question}', 'created', 0, 0, { question: questionId });
}

/** New question with its answers: at least two, exactly one correct, all in one transaction. */
function addQuestion(app, cardId, body) {
  const card = quizCard(app, cardId);
  const options = Array.isArray(body.answers) ? body.answers : [];
  const answers = options.map((option) => ({ text: cleanText(option && option.text), correct: Boolean(option && option.correct) }));
  if (answers.length < MIN_ANSWERS || answers.some((answer) => !answer.text)) {
    throw new BadRequestError(t(app, 'question_answers', { min: MIN_ANSWERS }));
  }
  if (answers.filter((answer) => answer.correct).length !== 1) {
    throw new BadRequestError(t(app, 'one_correct'));
  }

  let created;
  app.runInTransaction((txApp) => {
    const question = new Record(txApp.findCollectionByNameOrId('quiz_questions'));
    question.set('card', card.id);
    question.set('text', cleanText(body.text));
    saveOrBadRequest(txApp, question);
    for (const option of answers) {
      const answer = new Record(txApp.findCollectionByNameOrId('quiz_answers'));
      answer.set('question', question.id);
      answer.set('text', option.text);
      answer.set('correct', option.correct);
      saveOrBadRequest(txApp, answer);
    }
    created = question.id;
  });
  return questionView(app, app.findRecordById('quiz_questions', created));
}

function updateQuestion(app, questionId, text) {
  const question = findRecord(app, 'quiz_questions', questionId);
  question.set('text', cleanText(text));
  saveOrBadRequest(app, question);
  return questionView(app, question);
}

/** Deletes a question and its answers; players currently facing it get a new one. */
function deleteQuestion(app, questionId) {
  app.delete(findRecord(app, 'quiz_questions', questionId));
}

function addAnswer(app, questionId, body) {
  const question = findRecord(app, 'quiz_questions', questionId);
  const answer = new Record(app.findCollectionByNameOrId('quiz_answers'));
  answer.set('question', question.id);
  answer.set('text', cleanText(body.text));
  answer.set('correct', false);
  saveOrBadRequest(app, answer);
  if (body.correct) return updateAnswer(app, answer.id, { correct: true });
  return questionView(app, question);
}

/**
 * Edits an answer. Making it correct un-marks the previous correct one (in
 * one transaction); un-marking the only correct answer is refused: pick the
 * new correct answer instead.
 */
function updateAnswer(app, answerId, body) {
  const answer = findRecord(app, 'quiz_answers', answerId);
  const questionId = answer.getString('question');
  if (body.correct === false && answer.getBool('correct')) {
    throw new BadRequestError(t(app, 'keep_correct'));
  }
  app.runInTransaction((txApp) => {
    const target = txApp.findRecordById('quiz_answers', answerId);
    if (body.text !== undefined) target.set('text', cleanText(body.text));
    if (body.correct === true) {
      for (const other of siblings(txApp, questionId)) {
        if (other.id !== target.id && other.getBool('correct')) {
          other.set('correct', false);
          saveOrBadRequest(txApp, other);
        }
      }
      target.set('correct', true);
    }
    saveOrBadRequest(txApp, target);
  });
  return questionView(app, app.findRecordById('quiz_questions', questionId));
}

function deleteAnswer(app, answerId) {
  const answer = findRecord(app, 'quiz_answers', answerId);
  const questionId = answer.getString('question');
  if (answer.getBool('correct')) throw new BadRequestError(t(app, 'delete_correct'));
  if (siblings(app, questionId).length <= MIN_ANSWERS) {
    throw new BadRequestError(t(app, 'min_answers', { min: MIN_ANSWERS }));
  }
  app.delete(answer);
  return questionView(app, app.findRecordById('quiz_questions', questionId));
}

// ---- Guess who (spades) ----

const GUESS_RANKS = 13;

function personView(app, person) {
  const hints = Array(GUESS_RANKS).fill('');
  for (const hint of app.findRecordsByFilter('guess_hints', 'person = {:person}', 'rank', 0, 0, { person: person.id })) {
    const rank = hint.getInt('rank');
    if (rank >= 1 && rank <= GUESS_RANKS) hints[rank - 1] = hint.getString('text');
  }
  const assignments = app.findRecordsByFilter('guess_assignments', 'person = {:person}', '', 0, 0, { person: person.id });
  return {
    id: person.id,
    firstName: person.getString('first_name'),
    lastName: person.getString('last_name'),
    hints,
    assigned: assignments.length,
    found: assignments.filter((assignment) => assignment.getBool('found')).length,
  };
}

function listPeople(app) {
  return app.findRecordsByFilter('guess_people', '', 'created', 0, 0).map((person) => personView(app, person));
}

/** Name, surname and all 13 hints are required: a player may be given anyone. */
function personFields(app, body) {
  const hints = Array.isArray(body.hints) ? body.hints.map(cleanText) : [];
  const fields = { firstName: cleanText(body.firstName), lastName: cleanText(body.lastName), hints };
  if (!fields.firstName || !fields.lastName) throw new BadRequestError(t(app, 'person_name'));
  if (hints.length !== GUESS_RANKS || hints.some((hint) => !hint)) {
    throw new BadRequestError(t(app, 'person_hints', { count: GUESS_RANKS }));
  }
  return fields;
}

/** Writes a person and their hints in one transaction (hints are kept per rank). */
function savePerson(app, person, fields) {
  let id;
  app.runInTransaction((txApp) => {
    const record = person ? txApp.findRecordById('guess_people', person.id) : new Record(txApp.findCollectionByNameOrId('guess_people'));
    record.set('first_name', fields.firstName);
    record.set('last_name', fields.lastName);
    saveOrBadRequest(txApp, record);
    const existing = {};
    for (const hint of txApp.findRecordsByFilter('guess_hints', 'person = {:person}', '', 0, 0, { person: record.id })) {
      existing[hint.getInt('rank')] = hint;
    }
    fields.hints.forEach((text, index) => {
      const rank = index + 1;
      const hint = existing[rank] || new Record(txApp.findCollectionByNameOrId('guess_hints'));
      hint.set('person', record.id);
      hint.set('rank', rank);
      hint.set('text', text);
      saveOrBadRequest(txApp, hint);
    });
    id = record.id;
  });
  return personView(app, app.findRecordById('guess_people', id));
}

function addPerson(app, body) {
  return savePerson(app, null, personFields(app, body));
}

/** Edits apply at once, also for the players already looking for this person. */
function updatePerson(app, personId, body) {
  return savePerson(app, findRecord(app, 'guess_people', personId), personFields(app, body));
}

/** A person already given to a player cannot be deleted: their game depends on it. */
function deletePerson(app, personId) {
  const person = findRecord(app, 'guess_people', personId);
  const assigned = app.findRecordsByFilter('guess_assignments', 'person = {:person}', '', 1, 0, { person: person.id });
  if (assigned.length > 0) throw new BadRequestError(t(app, 'person_in_use'));
  app.delete(person);
}

// ---- Registered users (super admins assign the suits) ----

/** Lists of the super admins (users, RSVPs) are paginated, this many per page. */
const PER_PAGE = 20;

function userView(user) {
  return {
    id: user.id,
    name: user.getString('name'),
    email: user.getString('email'),
    verified: user.getBool('verified'),
    adminSuits: user.getStringSlice('admin_suits'),
    isSuperAdmin: user.getBool('is_superadmin'),
  };
}

/**
 * `[[a]] LIKE '%q%' OR [[b]] LIKE '%q%'` (case-insensitive for ASCII), with
 * % and _ taken literally (e-mails often have an _): escaped here and
 * declared with ESCAPE, which SQLite needs to honour the escapes.
 */
function containsAny(columns, q) {
  const pattern = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  return $dbx.exp(columns.map((column) => `[[${column}]] LIKE {:pattern} ESCAPE '\\'`).join(' OR '), { pattern });
}

/**
 * One page of `collection` matching `where`: counted in SQL, then never more
 * than PER_PAGE records loaded. The page is clamped to the existing ones.
 */
function paginate(app, collection, where, orderBy, page, view) {
  const totalItems = app.countRecords(collection, where);
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
  const current = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  // The same condition as the count, so pages and totals always agree.
  const items = arrayOf(new Record());
  app
    .recordQuery(collection)
    .andWhere(where)
    .orderBy(...orderBy)
    .limit(PER_PAGE)
    .offset((current - 1) * PER_PAGE)
    .all(items);
  return { items: items.map(view), page: current, perPage: PER_PAGE, totalItems, totalPages };
}

/** One page of the registered users, by name; `query` filters by name or e-mail. */
function listUsers(app, query, page) {
  const q = cleanText(query).slice(0, 100);
  const where = q ? containsAny(['name', 'email'], q) : $dbx.exp('1=1');
  return paginate(app, 'users', where, ['LOWER([[name]]) ASC', 'email ASC'], page, userView);
}

// ---- RSVPs (super admins) ----

// A guest may reply again (e.g. "yes" then "no"): only their latest reply,
// by e-mail, counts. `r` is the reply being checked.
const NEWER_REPLY_EXISTS = `EXISTS (SELECT 1 FROM rsvps n WHERE LOWER(n.email) = LOWER(r.email)
  AND (n.created > r.created OR (n.created = r.created AND n.id > r.id)))`;

function rsvpView(app) {
  return (rsvp) => ({
    id: rsvp.id,
    fullName: rsvp.getString('full_name'),
    email: rsvp.getString('email'),
    attending: rsvp.getBool('attending'),
    guests: rsvp.getInt('guests'),
    dietaryNotes: rsvp.getString('dietary_notes'),
    message: rsvp.getString('message'),
    created: rsvp.getDateTime('created').string(),
    // An older reply of a guest who replied again: shown, but not counted.
    replaced:
      app.countRecords(
        'rsvps',
        $dbx.exp(
          'LOWER([[email]]) = LOWER({:email}) AND ([[created]] > {:created} OR ([[created]] = {:created} AND [[id]] > {:id}))',
          { email: rsvp.getString('email'), created: rsvp.getString('created'), id: rsvp.id },
        ),
      ) > 0,
  });
}

/** The headcount, from the latest reply of each guest. */
function rsvpSummary(app) {
  const result = new DynamicModel({ replies: 0, attending: 0, declined: 0, guests: 0 });
  app
    .db()
    .newQuery(
      `SELECT COUNT(*) AS replies,
         COALESCE(SUM(CASE WHEN r.attending THEN 1 ELSE 0 END), 0) AS attending,
         COALESCE(SUM(CASE WHEN r.attending THEN 0 ELSE 1 END), 0) AS declined,
         COALESCE(SUM(CASE WHEN r.attending THEN r.guests ELSE 0 END), 0) AS guests
       FROM rsvps r WHERE NOT ${NEWER_REPLY_EXISTS}`,
    )
    .one(result);
  return { replies: result.replies, attending: result.attending, declined: result.declined, guests: result.guests };
}

/**
 * One page of the replies, newest first; `query` filters by name or e-mail,
 * `attending` ('yes' / 'no' / anything else for all) by answer. The summary
 * is always about every guest, whatever the filter.
 */
function listRsvps(app, query, attending, page) {
  const q = cleanText(query).slice(0, 100);
  const filters = [];
  if (q) filters.push(containsAny(['full_name', 'email'], q));
  if (attending === 'yes') filters.push($dbx.exp('[[attending]] = TRUE'));
  if (attending === 'no') filters.push($dbx.exp('[[attending]] = FALSE'));
  const where = filters.length ? $dbx.and(...filters) : $dbx.exp('1=1');
  return {
    ...paginate(app, 'rsvps', where, ['created DESC', 'id DESC'], page, rsvpView(app)),
    summary: rsvpSummary(app),
  };
}

/** Sets the suits a user organises (any of the four, no duplicates). */
function setUserSuits(app, userId, suits) {
  const user = findRecord(app, 'users', userId);
  const list = Array.isArray(suits) ? suits.map(String) : [];
  if (list.some((suit) => !SUITS.includes(suit))) throw new BadRequestError(t(app, 'unknown_suit'));
  // In the usual order, whatever order they were ticked in.
  user.set('admin_suits', SUITS.filter((suit) => list.includes(suit)));
  saveOrBadRequest(app, user);
  return userView(user);
}

module.exports = {
  listUsers,
  listRsvps,
  setUserSuits,
  requireSuitAdmin,
  requireSuperAdmin,
  requireAdminOf,
  listPeople,
  addPerson,
  updatePerson,
  deletePerson,
  listSuit,
  updateCard,
  addScene,
  updateScene,
  deleteScene,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  addAnswer,
  updateAnswer,
  deleteAnswer,
};
