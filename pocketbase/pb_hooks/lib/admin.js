/// <reference path="../../pb_data/types.d.ts" />

/** Helpers for pb_hooks/admin.pb.js (loaded with require()). */

const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const PHOTO_SUIT = 'hearts';
const RIDDLE_SUIT = 'clubs';
const QUIZ_SUIT = 'diamonds';
const GUESS_SUIT = 'spades';
const MIN_ANSWERS = 2;
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
  if (!SUITS.includes(suit)) throw new NotFoundError('Unknown suit.');
  return app.findRecordsByFilter('cards', 'suit = {:suit}', 'rank', 0, 0, { suit }).map((card) => cardView(app, card));
}

/**
 * Updates the editable fields of a card. Only the fields that make sense for
 * the card are accepted: the letter (Ace..10, not spades), riddle and solution (clubs).
 */
function updateCard(app, cardId, body) {
  const card = findRecord(app, 'cards', cardId, 'Card');
  const suit = card.getString('suit');
  const rank = card.getInt('rank');

  if (body.letter !== undefined) {
    if (isFaceCard(rank)) throw new BadRequestError('Jack, Queen and King have no letter.');
    if (suit === GUESS_SUIT) throw new BadRequestError('Spades have no letters: they are a "guess who" game.');
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

// ---- Quiz (diamonds) ----

const cleanText = (value) => String(value ?? '').trim();

function quizCard(app, cardId) {
  const card = findRecord(app, 'cards', cardId, 'Card');
  if (card.getString('suit') !== QUIZ_SUIT) throw new BadRequestError('Only diamonds have quiz questions.');
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
    throw new BadRequestError(`A question needs at least ${MIN_ANSWERS} answers, none of them empty.`);
  }
  if (answers.filter((answer) => answer.correct).length !== 1) {
    throw new BadRequestError('Mark exactly one answer as the correct one.');
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
  const question = findRecord(app, 'quiz_questions', questionId, 'Question');
  question.set('text', cleanText(text));
  saveOrBadRequest(app, question);
  return questionView(app, question);
}

/** Deletes a question and its answers; players currently facing it get a new one. */
function deleteQuestion(app, questionId) {
  app.delete(findRecord(app, 'quiz_questions', questionId, 'Question'));
}

function addAnswer(app, questionId, body) {
  const question = findRecord(app, 'quiz_questions', questionId, 'Question');
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
  const answer = findRecord(app, 'quiz_answers', answerId, 'Answer');
  const questionId = answer.getString('question');
  if (body.correct === false && answer.getBool('correct')) {
    throw new BadRequestError('Choose the new correct answer instead: a question always has one.');
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
  const answer = findRecord(app, 'quiz_answers', answerId, 'Answer');
  const questionId = answer.getString('question');
  if (answer.getBool('correct')) throw new BadRequestError('Choose another correct answer before deleting this one.');
  if (siblings(app, questionId).length <= MIN_ANSWERS) {
    throw new BadRequestError(`A question needs at least ${MIN_ANSWERS} answers.`);
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
function personFields(body) {
  const hints = Array.isArray(body.hints) ? body.hints.map(cleanText) : [];
  const fields = { firstName: cleanText(body.firstName), lastName: cleanText(body.lastName), hints };
  if (!fields.firstName || !fields.lastName) throw new BadRequestError('Please write the name and the surname.');
  if (hints.length !== GUESS_RANKS || hints.some((hint) => !hint)) {
    throw new BadRequestError(`Please write all the ${GUESS_RANKS} hints, one per card.`);
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
  return savePerson(app, null, personFields(body));
}

/** Edits apply at once, also for the players already looking for this person. */
function updatePerson(app, personId, body) {
  return savePerson(app, findRecord(app, 'guess_people', personId, 'Person'), personFields(body));
}

/** A person already given to a player cannot be deleted: their game depends on it. */
function deletePerson(app, personId) {
  const person = findRecord(app, 'guess_people', personId, 'Person');
  const assigned = app.findRecordsByFilter('guess_assignments', 'person = {:person}', '', 1, 0, { person: person.id });
  if (assigned.length > 0) throw new BadRequestError('This person is already being looked for by some guests: edit it instead.');
  app.delete(person);
}

module.exports = {
  requireAdmin,
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
