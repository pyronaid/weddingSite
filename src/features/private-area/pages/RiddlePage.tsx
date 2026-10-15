import { useCallback, useId, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import {
  cardImageUrl,
  isFaceCard,
  rankName,
  toGameError,
  type GameRepository,
  type Riddle,
} from '../../../services/game';
import { LetterInputs } from '../components/LetterInputs/LetterInputs';
import { useGameRepository } from '../game/GameRepositoryContext';
import { SUIT_META, suitPath } from '../game/suits';
import { useGameQuery } from '../game/useGameQuery';
import { AREA_HOME } from '../guards';
import { useAuth } from '../useAuth';
import styles from './RiddlePage.module.css';

/** Page opened by the QR code on a card poster: solve the riddle to collect the card. */
export function RiddlePage() {
  const { code = '' } = useParams();
  const load = useCallback((repository: GameRepository) => repository.getRiddle(code), [code]);
  const query = useGameQuery(load);
  useDocumentTitle('Riddle');

  if (query.status === 'loading') {
    return (
      <p className={styles.status} role="status">
        Unfolding the riddle…
      </p>
    );
  }

  if (query.status === 'error') {
    const notFound = query.error.code === 'not_found';
    return (
      <div className={styles.page}>
        <CardHeader id="riddle-title" eyebrow="Riddle" title={notFound ? 'Oops!' : 'Riddle'} />
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          {!notFound && query.error.code !== 'not_configured' && (
            <button type="button" className={formStyles.textButton} onClick={query.retry}>
              Try again
            </button>
          )}
        </div>
        <Link to={AREA_HOME} className={formStyles.secondary}>
          Go to your collection
        </Link>
      </div>
    );
  }

  // Keyed by code: another riddle never inherits this one's answer or result.
  return <RiddleContent key={code} code={code} riddle={query.data} />;
}

type Submission =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'wrong' }
  | { status: 'error'; message: string }
  | { status: 'solved'; letter: string | null };

function RiddleContent({ code, riddle }: { code: string; riddle: Riddle }) {
  const repository = useGameRepository();
  const { auth } = useAuth();
  const feedbackId = useId();
  const [letters, setLetters] = useState<string[]>(() => Array.from({ length: riddle.length }, () => ''));
  const [submission, setSubmission] = useState<Submission>(
    riddle.collected ? { status: 'solved', letter: riddle.letter } : { status: 'idle' },
  );

  const { label } = SUIT_META[riddle.suit];
  const cardName = `${rankName(riddle.rank)} of ${label.toLowerCase()}`;
  const complete = letters.every(Boolean);
  const submitting = submission.status === 'submitting';

  const handleChange = (next: string[]) => {
    setLetters(next);
    // Editing the answer clears the previous "wrong" message.
    if (submission.status === 'wrong' || submission.status === 'error') setSubmission({ status: 'idle' });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!complete || submitting) return;
    setSubmission({ status: 'submitting' });
    try {
      const attempt = await repository.solveRiddle(code, letters.join(''));
      setSubmission(attempt.correct ? { status: 'solved', letter: attempt.letter } : { status: 'wrong' });
    } catch (reason) {
      const error = toGameError(reason);
      if (error.code === 'unauthenticated') auth.logout();
      setSubmission({ status: 'error', message: error.message });
    }
  };

  return (
    <div className={styles.page}>
      <img className={styles.card} src={cardImageUrl(riddle.suit, riddle.rank)} alt={cardName} />
      <CardHeader id="riddle-title" eyebrow="Riddle" title={`${rankName(riddle.rank)} of ${label}`} />
      <blockquote className={styles.riddle}>{riddle.text}</blockquote>

      {submission.status === 'solved' ? (
        <div className={styles.solved} role="status">
          <p className={styles.solvedTitle}>You collected the {cardName}! 🎉</p>
          {isFaceCard(riddle.rank) ? (
            <p>
              You earned a <span className={styles.star}>★</span>
            </p>
          ) : (
            submission.letter && (
              <p>
                Your letter: <strong className={styles.letter}>{submission.letter}</strong>
              </p>
            )
          )}
          <Link to={suitPath(riddle.suit)} className={formStyles.submit}>
            See your {label.toLowerCase()}
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <fieldset className={styles.fieldset} disabled={submitting}>
            <legend className={styles.legend}>Your answer ({riddle.length} letters)</legend>
            <LetterInputs
              values={letters}
              onChange={handleChange}
              invalid={submission.status === 'wrong'}
              describedBy={feedbackId}
            />
          </fieldset>
          <p id={feedbackId} className={styles.feedback} role="alert">
            {submission.status === 'wrong' && 'Not quite! Read the riddle again and try another answer.'}
            {submission.status === 'error' && submission.message}
          </p>
          <button type="submit" className={formStyles.submit} disabled={!complete || submitting}>
            {submitting ? 'Checking…' : 'Submit'}
          </button>
        </form>
      )}

      <div className={styles.links}>
        <Link to={AREA_HOME}>Back to your collection</Link>
      </div>
    </div>
  );
}
