/// <reference path="../pb_data/types.d.ts" />

/**
 * Admin endpoints used by the organisers' view of the site. Every handler
 * checks `is_admin` first; each one writes only the fields it is meant to.
 *
 *   GET    /api/admin/suits/{suit}              cards with letter, riddle/solution (clubs), scenes (hearts)
 *   PATCH  /api/admin/cards/{cardId}            {letter?, riddle?, solution?}
 *   POST   /api/admin/cards/{cardId}/scenes     {text}       (numbered hearts)
 *   PATCH  /api/admin/scenes/{sceneId}          {text}
 *   DELETE /api/admin/scenes/{sceneId}
 *   POST   /api/admin/cards/{cardId}/questions  {text, answers: [{text, correct}]}   (diamonds)
 *   PATCH  /api/admin/questions/{questionId}    {text}
 *   DELETE /api/admin/questions/{questionId}
 *   POST   /api/admin/questions/{questionId}/answers  {text, correct?}
 *   PATCH  /api/admin/answers/{answerId}        {text?, correct?}   (correct: true moves the mark here)
 *   DELETE /api/admin/answers/{answerId}
 *   GET    /api/admin/guess/people              the people to find (spades), with their 13 hints
 *   POST   /api/admin/guess/people              {firstName, lastName, hints: [13 texts]}
 *   PATCH  /api/admin/guess/people/{personId}   {firstName, lastName, hints: [13 texts]}
 *   DELETE /api/admin/guess/people/{personId}   (refused once given to a player)
 *   GET    /api/admin/settings                  {signupCode}
 *   PATCH  /api/admin/settings                  {signupCode}
 */

routerAdd(
  'GET',
  '/api/admin/suits/{suit}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, { cards: admin.listSuit(e.app, e.request.pathValue('suit')) });
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/cards/{cardId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.updateCard(e.app, e.request.pathValue('cardId'), e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/admin/cards/{cardId}/scenes',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.addScene(e.app, e.request.pathValue('cardId'), e.requestInfo().body.text));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/scenes/{sceneId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.updateScene(e.app, e.request.pathValue('sceneId'), e.requestInfo().body.text));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'DELETE',
  '/api/admin/scenes/{sceneId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    admin.deleteScene(e.app, e.request.pathValue('sceneId'));
    return e.noContent(204);
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'GET',
  '/api/admin/settings',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    const { getSetting } = require(`${__hooks}/lib/settings.js`);
    admin.requireAdmin(e);
    return e.json(200, { signupCode: getSetting(e.app, 'signup_code', '') });
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/settings',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    const { setSetting } = require(`${__hooks}/lib/settings.js`);
    admin.requireAdmin(e);

    const code = String(e.requestInfo().body.signupCode ?? '').trim();
    // Empty would let anyone sign up: require a real code.
    if (code.length < 3 || code.length > 50) {
      const { t } = require(`${__hooks}/lib/i18n.js`);
      throw new BadRequestError(t(e.app, 'check_fields'), {
        signupCode: new ValidationError('validation_length', t(e.app, 'secret_code_length')),
      });
    }
    setSetting(e.app, 'signup_code', code);
    return e.json(200, { signupCode: code });
  },
  $apis.requireAuth('users'),
);

// ---- Quiz (diamonds) ----

routerAdd(
  'POST',
  '/api/admin/cards/{cardId}/questions',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.addQuestion(e.app, e.request.pathValue('cardId'), e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/questions/{questionId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.updateQuestion(e.app, e.request.pathValue('questionId'), e.requestInfo().body.text));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'DELETE',
  '/api/admin/questions/{questionId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    admin.deleteQuestion(e.app, e.request.pathValue('questionId'));
    return e.noContent(204);
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/admin/questions/{questionId}/answers',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.addAnswer(e.app, e.request.pathValue('questionId'), e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/answers/{answerId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.updateAnswer(e.app, e.request.pathValue('answerId'), e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'DELETE',
  '/api/admin/answers/{answerId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.deleteAnswer(e.app, e.request.pathValue('answerId')));
  },
  $apis.requireAuth('users'),
);

// ---- Guess who (spades) ----

routerAdd(
  'GET',
  '/api/admin/guess/people',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, { people: admin.listPeople(e.app) });
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/admin/guess/people',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.addPerson(e.app, e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'PATCH',
  '/api/admin/guess/people/{personId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    return e.json(200, admin.updatePerson(e.app, e.request.pathValue('personId'), e.requestInfo().body));
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'DELETE',
  '/api/admin/guess/people/{personId}',
  (e) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    admin.requireAdmin(e);
    admin.deletePerson(e.app, e.request.pathValue('personId'));
    return e.noContent(204);
  },
  $apis.requireAuth('users'),
);
