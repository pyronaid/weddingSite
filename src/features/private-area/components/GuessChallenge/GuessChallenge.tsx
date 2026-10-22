import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Modal } from '../../../../components/Modal/Modal';
import formStyles from '../../../../components/Form/Form.module.css';
import { PhotoCheckError, preparePhoto } from '../../../../lib/preparePhoto';
import { useMessages } from '../../../../i18n';
import { cardName, rankName, toGameError, type GuessCard, type PlayingCard } from '../../../../services/game';
import { useGameRepository } from '../../game/GameRepositoryContext';
import { gameMessages } from '../../messages/game';
import { useAuth } from '../../useAuth';
import styles from './GuessChallenge.module.css';

interface GuessChallengeProps {
  card: PlayingCard;
  /** The previous card has no selfie yet (always false for the Ace). */
  locked: boolean;
  /** Called once the card is collected (a selfie was sent or confirmed). */
  onCollected: () => void;
}

type ViewState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'ready'; view: GuessCard }
  | { status: 'error'; message: string };

type SendState =
  | { status: 'idle' }
  | { status: 'sending'; action: 'upload' | 'confirm' }
  | { status: 'error'; message: string }
  | { status: 'done' };

/** The last card: after it comes the final guess. */
const KING = 13;

/**
 * The button under a spades card and its modal: every hint from the Ace up
 * to this card, then a selfie with a guest matching all of them, or the
 * previous selfie confirmed ("same person as before"). Once sent, the
 * card's selfie is shown and cannot change.
 */
export function GuessChallenge({ card, locked, onCollected }: GuessChallengeProps) {
  const repository = useGameRepository();
  const { auth } = useAuth();
  const inputId = useId();
  const [state, setState] = useState<ViewState>({ status: 'closed' });
  const [send, setSend] = useState<SendState>({ status: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Ignores the answer of a request started before the latest open/close.
  const request = useRef(0);

  const t = useMessages(gameMessages);
  const name = cardName(card.rank, card.suit);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const failure = (reason: unknown) => {
    const error = toGameError(reason);
    if (error.code === 'unauthenticated') auth.logout();
    return error.message;
  };

  const open = async () => {
    const id = ++request.current;
    setState({ status: 'loading' });
    setSend({ status: 'idle' });
    setFile(null);
    setPreview(null);
    try {
      const view = await repository.getGuessCard(card.id);
      if (id === request.current) setState({ status: 'ready', view });
    } catch (reason) {
      if (id === request.current) setState({ status: 'error', message: failure(reason) });
    }
  };

  const close = () => {
    request.current += 1;
    setState({ status: 'closed' });
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
    setSend({ status: 'idle' });
  };

  /** Runs a send action; the server answers with the updated card. */
  const run = async (action: 'upload' | 'confirm', perform: () => Promise<GuessCard>) => {
    if (send.status === 'sending') return;
    const id = request.current;
    setSend({ status: 'sending', action });
    try {
      const view = await perform();
      if (id !== request.current) return;
      setState({ status: 'ready', view });
      setSend({ status: 'done' });
      setFile(null);
      setPreview(null);
      onCollected();
    } catch (reason) {
      if (id !== request.current) return;
      setSend({ status: 'error', message: reason instanceof PhotoCheckError ? reason.message : failure(reason) });
    }
  };

  const upload = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    void run('upload', async () => repository.uploadSelfie(card.id, await preparePhoto(file)));
  };

  const confirm = () => void run('confirm', () => repository.confirmPreviousSelfie(card.id));

  const label = t.guess.trigger(locked, card.collected, card.rank);
  const view = state.status === 'ready' ? state.view : null;
  const sending = send.status === 'sending';

  return (
    <>
      {/* Icon only: the label is announced by screen readers and shown as a tooltip. */}
      <button
        type="button"
        className={styles.trigger}
        onClick={open}
        disabled={locked}
        aria-label={label}
        title={label}
      >
        <span aria-hidden="true">{locked ? '🔒' : '🔍'}</span>
      </button>

      <Modal open={state.status !== 'closed'} onClose={close} title={t.guess.title(name)}>
        {state.status === 'loading' && (
          <p className={styles.muted} role="status">
            {t.guess.loading}
          </p>
        )}

        {state.status === 'error' && (
          <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
            {state.message}
          </p>
        )}

        {view?.locked && (
          <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
            {t.guess.locked(card.rank)}
          </p>
        )}

        {view && !view.locked && (
          <div className={styles.body}>
            <section aria-labelledby={`${inputId}-hints`}>
              <h3 id={`${inputId}-hints`} className={styles.label}>
                {t.guess.hintsTitle(view.hints.length)}
              </h3>
              <ol className={styles.hints}>
                {view.hints.map((hint) => (
                  <li key={hint.rank} className={hint.rank === view.rank ? styles.newHint : undefined}>
                    <span className={styles.hintRank}>{rankName(hint.rank)}</span>
                    <span className={styles.hintText}>{hint.text}</span>
                    {hint.rank === view.rank && view.hints.length > 1 && <span className={styles.badge}>{t.guess.newBadge}</span>}
                  </li>
                ))}
              </ol>
            </section>

            {view.selfie ? (
              <div className={`${styles.selfie} ${send.status === 'done' ? styles.justDone : ''}`} role="status">
                {send.status === 'done' && (
                  <p className={styles.doneTitle}>
                    {view.rank === KING ? t.guess.allYours : t.guess.collected}
                  </p>
                )}
                {view.selfie.url && (
                  <img className={styles.photo} src={view.selfie.url} alt={t.guess.selfieAlt(card.rank)} />
                )}
                <p className={styles.muted}>
                  {view.selfie.reused ? t.guess.sameAsBefore(view.selfie.takenFor) : t.guess.yourSelfie}{' '}
                  {view.rank === KING
                    ? t.guess.nowGuess
                    : send.status === 'done'
                      ? t.guess.unlocked(view.rank + 1)
                      : t.guess.cannotChange}
                </p>
                {send.status === 'done' && (
                  <button type="button" className={formStyles.submit} onClick={close}>
                    {t.backToCards}
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className={styles.muted}>{t.guess.find(view.hints.length)}</p>

                {view.previous && (
                  <div className={styles.previous}>
                    {view.previous.url && (
                      <img
                        className={styles.thumb}
                        src={view.previous.url}
                        alt={t.guess.selfieAlt(view.previous.takenFor)}
                      />
                    )}
                    <div className={styles.previousText}>
                      <p className={styles.muted}>{t.guess.stillMatches}</p>
                      <button type="button" className={formStyles.secondary} onClick={confirm} disabled={sending}>
                        {send.status === 'sending' && send.action === 'confirm' ? t.guess.confirming : t.guess.samePerson}
                      </button>
                    </div>
                  </div>
                )}

                <form className={styles.form} onSubmit={upload}>
                  {preview && <img className={styles.photo} src={preview} alt={t.guess.selectedAlt} />}
                  <input
                    id={inputId}
                    className="visually-hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    onChange={choose}
                  />
                  <label htmlFor={inputId} className={formStyles.secondary}>
                    {file ? t.guess.chooseAnother : view.previous ? t.guess.takeNew : t.guess.choose}
                  </label>
                  <button type="submit" className={formStyles.submit} disabled={!file || sending}>
                    {send.status === 'sending' && send.action === 'upload' ? t.guess.uploading : t.guess.upload}
                  </button>
                </form>
              </>
            )}

            {send.status === 'error' && (
              <p role="alert" className={styles.error}>
                {send.message}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
