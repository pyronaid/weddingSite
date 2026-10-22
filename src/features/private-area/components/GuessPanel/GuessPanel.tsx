import { useId, useState, type FormEvent } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../i18n';
import { toGameError, type GuessStatus } from '../../../../services/game';
import { useGameRepository } from '../../game/GameRepositoryContext';
import { gameMessages } from '../../messages/game';
import { useAuth } from '../../useAuth';
import { LetterInputs } from '../LetterInputs/LetterInputs';
import styles from './GuessPanel.module.css';

interface GuessPanelProps {
  /** Undefined while loading (or when it could not be loaded). */
  status: GuessStatus | undefined;
  /** The person was guessed: the new status. */
  onFound: (status: GuessStatus) => void;
}

/** "Guess who" box of the spades page: how far the player is, then the final guess. */
export function GuessPanel({ status, onFound }: GuessPanelProps) {
  const t = useMessages(gameMessages).guessPanel;
  if (!status) return null;
  const titleId = 'guess-title';

  return (
    <section className={`${styles.panel} ${status.found ? styles.found : ''}`} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        {t.title}
      </h3>
      {status.found ? (
        <p className={styles.result} role="status">
          {t.found(status.name)}
        </p>
      ) : status.complete && status.lengths ? (
        // Keyed by the lengths: a change from the organisers resets the boxes.
        <GuessForm
          key={`${status.lengths.firstName}-${status.lengths.lastName}`}
          lengths={status.lengths}
          onFound={(name) => onFound({ ...status, found: true, name, lengths: null })}
        />
      ) : (
        <p className={styles.note}>
          {status.assigned
            ? t.collectAll
            : t.openAce}
        </p>
      )}
    </section>
  );
}

type Submission = { status: 'idle' } | { status: 'submitting' } | { status: 'wrong' } | { status: 'error'; message: string };

const emptyBoxes = (count: number) => Array.from({ length: count }, () => '');

function GuessForm({
  lengths,
  onFound,
}: {
  lengths: NonNullable<GuessStatus['lengths']>;
  onFound: (name: string) => void;
}) {
  const repository = useGameRepository();
  const { auth } = useAuth();
  const all = useMessages(gameMessages);
  const t = all.guessPanel;
  const feedbackId = useId();
  const [firstName, setFirstName] = useState(() => emptyBoxes(lengths.firstName));
  const [lastName, setLastName] = useState(() => emptyBoxes(lengths.lastName));
  const [submission, setSubmission] = useState<Submission>({ status: 'idle' });
  const submitting = submission.status === 'submitting';
  const complete = [...firstName, ...lastName].every(Boolean);

  // Editing clears the previous "wrong" message.
  const edit = (setter: (values: string[]) => void) => (values: string[]) => {
    setter(values);
    if (submission.status === 'wrong' || submission.status === 'error') setSubmission({ status: 'idle' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!complete || submitting) return;
    setSubmission({ status: 'submitting' });
    try {
      const result = await repository.solveGuess(firstName.join(''), lastName.join(''));
      if (result.correct) onFound(result.name ?? `${firstName.join('')} ${lastName.join('')}`);
      else setSubmission({ status: 'wrong' });
    } catch (reason) {
      const error = toGameError(reason);
      if (error.code === 'unauthenticated') auth.logout();
      setSubmission({ status: 'error', message: error.message });
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.note}>{t.question}</p>
      <fieldset className={styles.fieldset} disabled={submitting}>
        <legend className={styles.legend}>{t.name(lengths.firstName)}</legend>
        <LetterInputs
          values={firstName}
          onChange={edit(setFirstName)}
          invalid={submission.status === 'wrong'}
          describedBy={feedbackId}
          label={t.nameBoxes}
        />
      </fieldset>
      <fieldset className={styles.fieldset} disabled={submitting}>
        <legend className={styles.legend}>{t.surname(lengths.lastName)}</legend>
        <LetterInputs
          values={lastName}
          onChange={edit(setLastName)}
          invalid={submission.status === 'wrong'}
          describedBy={feedbackId}
          label={t.surnameBoxes}
        />
      </fieldset>
      <p id={feedbackId} className={styles.feedback} role="alert">
        {submission.status === 'wrong' && t.wrong}
        {submission.status === 'error' && submission.message}
      </p>
      <button type="submit" className={formStyles.submit} disabled={!complete || submitting}>
        {submitting ? all.checking : all.submit}
      </button>
    </form>
  );
}
