import { useId, useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { toAdminError, type AdminQuestion } from '../../../services/admin';
import { useAdminRepository } from './AdminRepositoryContext';
import styles from './admin.module.css';

interface QuestionsEditorProps {
  cardId: string;
  cardName: string;
  questions: AdminQuestion[];
  /** Jack, Queen, King: asked in person, guests only see the number and A, B, C... */
  inPerson?: boolean;
}

const LETTERS = 'ABCDEFGHIJ';

const emptyDraft = () => ({ text: '', answers: ['', '', ''], correct: 0 });

/** The quiz questions of a diamonds card: questions, answers and the correct one. */
export function QuestionsEditor({ cardId, cardName, questions: initial, inPerson = false }: QuestionsEditorProps) {
  const repository = useAdminRepository();
  const [questions, setQuestions] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Runs an operation that returns the updated question (or null when deleted). */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (reason) {
      const failure = toAdminError(reason);
      setError(Object.values(failure.fieldErrors)[0] ?? failure.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const replace = (updated: AdminQuestion) =>
    setQuestions((list) => list.map((question) => (question.id === updated.id ? updated : question)));

  return (
    <div className={styles.scenes}>
      <p className={styles.subTitle}>
        Quiz questions <span className={styles.count}>({questions.length})</span>
      </p>
      {questions.length === 0 && <p className={styles.warning}>No questions yet: guests cannot play this card.</p>}
      {inPerson && questions.length > 0 && (
        <p className={styles.hint}>
          Asked in person: guests only see “Question n°” and the letters. Read the question and its answers in this
          order to them.
        </p>
      )}

      {questions.map((question, index) => (
        <QuestionItem
          key={question.id}
          question={question}
          label={`question ${index + 1} of the ${cardName}`}
          number={inPerson ? index + 1 : undefined}
          busy={busy}
          onSaveText={(text) => run(async () => replace(await repository.updateQuestion(question.id, text)))}
          onDelete={() =>
            run(async () => {
              await repository.deleteQuestion(question.id);
              setQuestions((list) => list.filter((item) => item.id !== question.id));
            })
          }
          onMarkCorrect={(answerId) => run(async () => replace(await repository.updateAnswer(answerId, { correct: true })))}
          onSaveAnswer={(answerId, text) => run(async () => replace(await repository.updateAnswer(answerId, { text })))}
          onDeleteAnswer={(answerId) => run(async () => replace(await repository.deleteAnswer(answerId)))}
          onAddAnswer={(text) => run(async () => replace(await repository.addAnswer(question.id, { text })))}
        />
      ))}

      <NewQuestionForm
        cardName={cardName}
        busy={busy}
        onAdd={(draft) =>
          run(async () => {
            const created = await repository.addQuestion(cardId, draft);
            setQuestions((list) => [...list, created]);
          })
        }
      />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

interface QuestionItemProps {
  question: AdminQuestion;
  label: string;
  /** Shown for in-person questions, with the answer letters. */
  number?: number;
  busy: boolean;
  onSaveText: (text: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onMarkCorrect: (answerId: string) => Promise<boolean>;
  onSaveAnswer: (answerId: string, text: string) => Promise<boolean>;
  onDeleteAnswer: (answerId: string) => Promise<boolean>;
  onAddAnswer: (text: string) => Promise<boolean>;
}

function QuestionItem({ question, label, number, busy, ...actions }: QuestionItemProps) {
  const uid = useId();
  const [text, setText] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [newAnswer, setNewAnswer] = useState('');
  const [confirming, setConfirming] = useState(false);

  const textChanged = text !== null && text.trim() !== question.text;

  return (
    <fieldset className={styles.question}>
      {number !== undefined ? (
        <legend className={styles.questionNumber}>Question n° {number}</legend>
      ) : (
        <legend className="visually-hidden">{label}</legend>
      )}
      <div className={styles.sceneRow}>
        <textarea
          aria-label={`Text of ${label}`}
          rows={2}
          maxLength={500}
          value={text ?? question.text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className={styles.sceneActions}>
          <button
            type="button"
            className={formStyles.textButton}
            disabled={!textChanged || busy}
            onClick={async () => (await actions.onSaveText(text!.trim())) && setText(null)}
          >
            Save question
          </button>
          {confirming ? (
            <button
              type="button"
              className={`${formStyles.textButton} ${styles.danger}`}
              disabled={busy}
              onClick={() => void actions.onDelete()}
            >
              Confirm delete
            </button>
          ) : (
            <button
              type="button"
              className={formStyles.textButton}
              disabled={busy}
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${label}`}
            >
              Delete question
            </button>
          )}
        </div>
      </div>

      <ul className={styles.answers}>
        {question.answers.map((answer, index) => {
          const draft = answerDrafts[answer.id];
          const changed = draft !== undefined && draft.trim() !== answer.text;
          return (
            <li key={answer.id} className={`${styles.answer} ${answer.correct ? styles.correct : ''}`}>
              {number !== undefined && (
                <span className={styles.answerLetter} aria-hidden="true">
                  {LETTERS[index]}
                </span>
              )}
              <input
                type="radio"
                name={`${uid}-correct`}
                checked={answer.correct}
                disabled={busy}
                aria-label={`Answer ${index + 1} is the correct one`}
                onChange={() => void actions.onMarkCorrect(answer.id)}
              />
              <input
                className={styles.answerText}
                aria-label={`Answer ${index + 1} of ${label}`}
                maxLength={200}
                value={draft ?? answer.text}
                onChange={(event) => setAnswerDrafts((all) => ({ ...all, [answer.id]: event.target.value }))}
              />
              <button
                type="button"
                className={formStyles.textButton}
                disabled={!changed || busy}
                aria-label={`Save answer ${index + 1} of ${label}`}
                onClick={async () =>
                  (await actions.onSaveAnswer(answer.id, draft.trim())) &&
                  setAnswerDrafts(({ [answer.id]: _saved, ...rest }) => rest)
                }
              >
                Save
              </button>
              <button
                type="button"
                className={formStyles.textButton}
                disabled={busy || answer.correct || question.answers.length <= 2}
                aria-label={`Delete answer ${index + 1} of ${label}`}
                title={answer.correct ? 'Mark another answer as correct first' : undefined}
                onClick={() => void actions.onDeleteAnswer(answer.id)}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <form
        className={styles.addAnswer}
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();
          if (newAnswer.trim() && (await actions.onAddAnswer(newAnswer.trim()))) setNewAnswer('');
        }}
      >
        <input
          className={styles.answerText}
          aria-label={`New answer for ${label}`}
          placeholder="Another answer"
          maxLength={200}
          value={newAnswer}
          onChange={(event) => setNewAnswer(event.target.value)}
        />
        <button type="submit" className={formStyles.textButton} disabled={!newAnswer.trim() || busy}>
          Add answer
        </button>
      </form>
    </fieldset>
  );
}

interface NewQuestionFormProps {
  cardName: string;
  busy: boolean;
  onAdd: (question: { text: string; answers: { text: string; correct: boolean }[] }) => Promise<boolean>;
}

function NewQuestionForm({ cardName, busy, onAdd }: NewQuestionFormProps) {
  const uid = useId();
  const [draft, setDraft] = useState(emptyDraft);

  const filled = draft.answers.map((answer, index) => ({ text: answer.trim(), correct: index === draft.correct }));
  const answers = filled.filter((answer) => answer.text);
  const valid = draft.text.trim() && answers.length >= 2 && answers.some((answer) => answer.correct);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    if (await onAdd({ text: draft.text.trim(), answers })) setDraft(emptyDraft());
  };

  return (
    <form className={styles.newQuestion} onSubmit={submit} aria-label={`New question for the ${cardName}`}>
      <p className={styles.subTitle}>New question</p>
      <textarea
        aria-label={`New question text for the ${cardName}`}
        rows={2}
        maxLength={500}
        placeholder="e.g. Where did the couple meet?"
        value={draft.text}
        onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
      />
      <ul className={styles.answers}>
        {draft.answers.map((answer, index) => (
          <li key={index} className={`${styles.answer} ${draft.correct === index ? styles.correct : ''}`}>
            <input
              type="radio"
              name={`${uid}-correct`}
              checked={draft.correct === index}
              aria-label={`New answer ${index + 1} is the correct one`}
              onChange={() => setDraft((current) => ({ ...current, correct: index }))}
            />
            <input
              className={styles.answerText}
              aria-label={`New answer ${index + 1} for the ${cardName}`}
              maxLength={200}
              placeholder={`Answer ${index + 1}`}
              value={answer}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  answers: current.answers.map((item, i) => (i === index ? event.target.value : item)),
                }))
              }
            />
          </li>
        ))}
      </ul>
      <div className={styles.sceneActions}>
        <button
          type="button"
          className={formStyles.textButton}
          disabled={draft.answers.length >= 6}
          onClick={() => setDraft((current) => ({ ...current, answers: [...current.answers, ''] }))}
        >
          + Another answer
        </button>
        <button type="submit" className={formStyles.textButton} disabled={!valid || busy}>
          Add question
        </button>
      </div>
      <p className={styles.hint}>Select the correct answer with the round button. At least two answers.</p>
    </form>
  );
}
