import { useId, useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { toAdminError, type AdminQuestion } from '../../../services/admin';
import { useMessages } from '../../../i18n';
import { adminMessages } from '../messages/admin';
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
  const t = useMessages(adminMessages).quiz;
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
        {t.title} <span className={styles.count}>({questions.length})</span>
      </p>
      {questions.length === 0 && <p className={styles.warning}>{t.none}</p>}
      {inPerson && questions.length > 0 && (
        <p className={styles.hint}>
          {t.inPerson}
        </p>
      )}

      {questions.map((question, index) => (
        <QuestionItem
          key={question.id}
          question={question}
          label={t.question(index + 1, cardName)}
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
  const messages = useMessages(adminMessages);
  const t = messages.quiz;

  const textChanged = text !== null && text.trim() !== question.text;

  return (
    <fieldset className={styles.question}>
      {number !== undefined ? (
        <legend className={styles.questionNumber}>{t.number(number)}</legend>
      ) : (
        <legend className="visually-hidden">{label}</legend>
      )}
      <div className={styles.sceneRow}>
        <textarea
          aria-label={t.text(label)}
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
            {t.saveQuestion}
          </button>
          {confirming ? (
            <button
              type="button"
              className={`${formStyles.textButton} ${styles.danger}`}
              disabled={busy}
              onClick={() => void actions.onDelete()}
            >
              {messages.common.confirmDelete}
            </button>
          ) : (
            <button
              type="button"
              className={formStyles.textButton}
              disabled={busy}
              onClick={() => setConfirming(true)}
              aria-label={t.deleteLabel(label)}
            >
              {t.deleteQuestion}
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
                aria-label={t.isCorrect(index + 1)}
                onChange={() => void actions.onMarkCorrect(answer.id)}
              />
              <input
                className={styles.answerText}
                aria-label={t.answer(index + 1, label)}
                maxLength={200}
                value={draft ?? answer.text}
                onChange={(event) => setAnswerDrafts((all) => ({ ...all, [answer.id]: event.target.value }))}
              />
              <button
                type="button"
                className={formStyles.textButton}
                disabled={!changed || busy}
                aria-label={t.saveAnswer(index + 1, label)}
                onClick={async () =>
                  (await actions.onSaveAnswer(answer.id, draft.trim())) &&
                  setAnswerDrafts(({ [answer.id]: _saved, ...rest }) => rest)
                }
              >
                {messages.common.save}
              </button>
              <button
                type="button"
                className={formStyles.textButton}
                disabled={busy || answer.correct || question.answers.length <= 2}
                aria-label={t.deleteAnswer(index + 1, label)}
                title={answer.correct ? t.markAnotherFirst : undefined}
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
          aria-label={t.newAnswer(label)}
          placeholder={t.anotherAnswer}
          maxLength={200}
          value={newAnswer}
          onChange={(event) => setNewAnswer(event.target.value)}
        />
        <button type="submit" className={formStyles.textButton} disabled={!newAnswer.trim() || busy}>
          {t.addAnswer}
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
  const t = useMessages(adminMessages).quiz;

  const filled = draft.answers.map((answer, index) => ({ text: answer.trim(), correct: index === draft.correct }));
  const answers = filled.filter((answer) => answer.text);
  const valid = draft.text.trim() && answers.length >= 2 && answers.some((answer) => answer.correct);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    if (await onAdd({ text: draft.text.trim(), answers })) setDraft(emptyDraft());
  };

  return (
    <form className={styles.newQuestion} onSubmit={submit} aria-label={t.newQuestionLabel(cardName)}>
      <p className={styles.subTitle}>{t.newQuestion}</p>
      <textarea
        aria-label={t.newQuestionText(cardName)}
        rows={2}
        maxLength={500}
        placeholder={t.newQuestionPlaceholder}
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
              aria-label={t.newIsCorrect(index + 1)}
              onChange={() => setDraft((current) => ({ ...current, correct: index }))}
            />
            <input
              className={styles.answerText}
              aria-label={t.newAnswerLabel(index + 1, cardName)}
              maxLength={200}
              placeholder={t.answerPlaceholder(index + 1)}
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
          {t.plusAnswer}
        </button>
        <button type="submit" className={formStyles.textButton} disabled={!valid || busy}>
          {t.addQuestion}
        </button>
      </div>
      <p className={styles.hint}>{t.newHint}</p>
    </form>
  );
}
