import { useId, useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../../../components/Modal/Modal';
import formStyles from '../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../i18n';
import {
  cardName,
  isFaceCard,
  toGameError,
  type PlayingCard,
  type QuizQuestion,
  type QuizStatus,
} from '../../../../services/game';
import { useGameRepository } from '../../game/GameRepositoryContext';
import { gameMessages } from '../../messages/game';
import { useAuth } from '../../useAuth';
import styles from './QuizChallenge.module.css';

interface QuizChallengeProps {
  card: PlayingCard;
  /** New lives/penalties after each answer. */
  onStatus: (status: QuizStatus) => void;
  /** The card was won. */
  onCollected: () => void;
}

type ModalState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'question'; question: QuizQuestion; feedback: string | null }
  | { status: 'won'; letter: string | null };

/**
 * The button under a diamonds card and its quiz modal. The question is
 * drawn by the server once and kept until answered, even if the modal is
 * closed or the player goes elsewhere.
 */
export function QuizChallenge({ card, onStatus, onCollected }: QuizChallengeProps) {
  const repository = useGameRepository();
  const { auth } = useAuth();
  const groupId = useId();
  const [state, setState] = useState<ModalState>({ status: 'closed' });
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const request = useRef(0);

  const t = useMessages(gameMessages);
  const name = cardName(card.rank, card.suit);
  const label = t.quiz.trigger(card.collected, card.rank, card.suit);

  const failure = (reason: unknown) => {
    const error = toGameError(reason);
    if (error.code === 'unauthenticated') auth.logout();
    return error.code === 'not_found' ? t.quiz.noQuestions : error.message;
  };

  const open = async () => {
    const id = ++request.current;
    setState({ status: 'loading' });
    setChoice(null);
    try {
      const draw = await repository.getQuizQuestion(card.id);
      if (id !== request.current) return;
      onStatus(draw.status);
      setState(draw.solved ? { status: 'won', letter: draw.letter } : { status: 'question', question: draw.question, feedback: null });
    } catch (reason) {
      if (id === request.current) setState({ status: 'error', message: failure(reason) });
    }
  };

  const close = () => {
    request.current += 1;
    setState({ status: 'closed' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.status !== 'question' || !choice || submitting) return;
    setSubmitting(true);
    try {
      const before = state;
      const result = await repository.answerQuiz(card.id, before.question.questionId, choice);
      onStatus(result.status);
      setChoice(null);
      if (result.correct) {
        setState({ status: 'won', letter: result.letter });
        onCollected();
      } else {
        const feedback = result.stale
          ? t.quiz.stale
          : result.status.penalties > 0 && result.status.lives === 0
            ? t.quiz.penalty(result.status.penalties)
            : t.quiz.lifeLost(result.status.lives);
        setState({ status: 'question', question: result.question, feedback });
      }
    } catch (reason) {
      setState({ status: 'error', message: failure(reason) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} aria-label={label} title={label}>
        <span aria-hidden="true">❓</span>
      </button>

      <Modal open={state.status !== 'closed'} onClose={close} title={t.quiz.title(name)}>
        {state.status === 'loading' && (
          <p className={styles.muted} role="status">
            {t.quiz.loading}
          </p>
        )}

        {state.status === 'error' && (
          <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
            {state.message}
          </p>
        )}

        {state.status === 'won' && (
          <div className={styles.won} role="status">
            <p className={styles.wonTitle}>{t.quiz.right}</p>
            <p>{t.quiz.collected(card.rank, card.suit)}</p>
            {isFaceCard(card.rank) ? (
              <p>
                {t.earnedStar} <span className={styles.star}>★</span>
              </p>
            ) : (
              state.letter && (
                <p>
                  {t.yourLetter} <strong className={styles.letter}>{state.letter}</strong>
                </p>
              )
            )}
            <button type="button" className={formStyles.submit} onClick={close}>
              {t.backToCards}
            </button>
          </div>
        )}

        {state.status === 'question' && (
          <form className={styles.form} onSubmit={submit}>
            {state.feedback && (
              <p role="alert" className={styles.feedback}>
                {state.feedback}
              </p>
            )}
            <fieldset className={styles.fieldset} disabled={submitting} aria-describedby={`${groupId}-hint`}>
              <legend className={styles.question}>
                {state.question.inPerson ? t.quiz.number(state.question.number) : state.question.text}
              </legend>
              {state.question.inPerson && (
                <p className={styles.inPerson}>{t.quiz.inPerson(card.rank, card.suit, state.question.number)}</p>
              )}
              <div className={`${styles.options} ${state.question.inPerson ? styles.letters : ''}`}>
                {state.question.answers.map((answer) => (
                  <label key={answer.id} className={`${styles.option} ${choice === answer.id ? styles.chosen : ''}`}>
                    <input
                      type="radio"
                      name={groupId}
                      value={answer.id}
                      checked={choice === answer.id}
                      onChange={() => setChoice(answer.id)}
                    />
                    <span>{answer.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p id={`${groupId}-hint`} className={styles.muted}>
              {t.quiz.hint}
            </p>
            <button type="submit" className={formStyles.submit} disabled={!choice || submitting}>
              {submitting ? t.checking : t.submit}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
