/// <reference path="../pb_data/types.d.ts" />

/**
 * Quiz (diamonds): every diamonds card has a bucket of multiple-choice
 * questions about the newlyweds. Guests only ever see one question at a time
 * through pb_hooks/quiz.pb.js, never which answer is correct.
 *
 * - `quiz_questions` / `quiz_answers`: the buckets, managed by the organisers
 *   (admin endpoints); exactly one correct answer per question.
 * - `quiz_attempts`: one row per (user, card): the current question (kept
 *   until answered, across sessions), the questions already faced and the
 *   wrong answers. Lives and penalties are computed from the wrong answers of
 *   all the user's attempts. Server-only (all rules null).
 *
 * Placeholder questions are seeded so the game works out of the box: replace
 * them from the organisers' view (their answers are in this repository).
 */
const PLACEHOLDERS = [
  ['Where did the couple meet for the first time?', ['At a friend’s party', 'At university', 'On a train']],
  ['What is the groom’s favourite dish?', ['Lasagne', 'Sushi', 'Pizza margherita']],
];

migrate(
  (app) => {
    const cards = app.findCollectionByNameOrId('cards');
    const users = app.findCollectionByNameOrId('users');

    const questions = new Collection({
      type: 'base',
      name: 'quiz_questions',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        { name: 'text', type: 'text', required: true, max: 500, presentable: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_quiz_questions_card ON quiz_questions (card)'],
    });
    app.save(questions);

    const answers = new Collection({
      type: 'base',
      name: 'quiz_answers',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'question',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: questions.id,
          cascadeDelete: true,
        },
        { name: 'text', type: 'text', required: true, max: 200, presentable: true },
        { name: 'correct', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_quiz_answers_question ON quiz_answers (question)'],
    });
    app.save(answers);

    const attempts = new Collection({
      type: 'base',
      name: 'quiz_attempts',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'card', type: 'relation', required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
        // Empty once the card is collected (or if the question was deleted).
        { name: 'question', type: 'relation', maxSelect: 1, collectionId: questions.id, cascadeDelete: false },
        // Ids of the questions already faced, to avoid repeating them.
        { name: 'seen', type: 'json', maxSize: 20000 },
        { name: 'wrong', type: 'number', min: 0, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_quiz_attempts_user_card ON quiz_attempts (user, card)',
        'CREATE INDEX idx_quiz_attempts_user ON quiz_attempts (user)',
      ],
    });
    app.save(attempts);

    const diamonds = app.findRecordsByFilter('cards', 'suit = "diamonds"', 'rank', 0, 0);
    for (const card of diamonds) {
      for (const [text, options] of PLACEHOLDERS) {
        const question = new Record(questions);
        question.set('card', card.id);
        question.set('text', `${text} (example)`);
        app.save(question);
        options.forEach((option, index) => {
          const answer = new Record(answers);
          answer.set('question', question.id);
          answer.set('text', option);
          answer.set('correct', index === 0);
          app.save(answer);
        });
      }
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('quiz_attempts'));
    app.delete(app.findCollectionByNameOrId('quiz_answers'));
    app.delete(app.findCollectionByNameOrId('quiz_questions'));
  },
);
