import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Modal } from '../../../../components/Modal/Modal';
import formStyles from '../../../../components/Form/Form.module.css';
import { PhotoCheckError, preparePhoto } from '../../../../lib/preparePhoto';
import { rankName, toGameError, type PhotoDraw, type PlayingCard } from '../../../../services/game';
import { useGameRepository } from '../../game/GameRepositoryContext';
import { SUIT_META } from '../../game/suits';
import { useAuth } from '../../useAuth';
import styles from './PhotoChallenge.module.css';

interface PhotoChallengeProps {
  card: PlayingCard;
  /** Called after a successful upload (the card is now collected). */
  onUploaded: () => void;
}

type DrawState =
  | { status: 'closed' }
  | { status: 'drawing' }
  | { status: 'ready'; draw: PhotoDraw }
  | { status: 'error'; message: string };

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }
  | { status: 'done' };

/**
 * The button under a hearts card and its modal. Every press draws a new
 * random scene on the server (so a photo cannot be prepared in advance),
 * unless a photo was already uploaded: then the scene is locked and only the
 * photo can be replaced.
 */
export function PhotoChallenge({ card, onUploaded }: PhotoChallengeProps) {
  const repository = useGameRepository();
  const { auth } = useAuth();
  const inputId = useId();
  const [draw, setDraw] = useState<DrawState>({ status: 'closed' });
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Ignores the answer of a draw started before the latest open/close.
  const request = useRef(0);

  const name = `${rankName(card.rank)} of ${SUIT_META[card.suit].label.toLowerCase()}`;

  // Object URLs keep the image in memory: release the previous one.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFailure = (reason: unknown) => {
    const error = toGameError(reason);
    if (error.code === 'unauthenticated') auth.logout();
    return error.message;
  };

  const open = async () => {
    const id = ++request.current;
    setDraw({ status: 'drawing' });
    setUpload({ status: 'idle' });
    setFile(null);
    setPreview(null);
    try {
      const result = await repository.drawPhotoScene(card.id);
      if (id === request.current) setDraw({ status: 'ready', draw: result });
    } catch (reason) {
      if (id === request.current) setDraw({ status: 'error', message: handleFailure(reason) });
    }
  };

  const close = () => {
    request.current += 1;
    setDraw({ status: 'closed' });
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
    setUpload({ status: 'idle' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (draw.status !== 'ready' || !file || upload.status === 'uploading') return;
    setUpload({ status: 'uploading' });
    try {
      await repository.uploadPhoto(draw.draw.submissionId, await preparePhoto(file));
      setUpload({ status: 'done' });
      onUploaded();
    } catch (reason) {
      const message = reason instanceof PhotoCheckError ? reason.message : handleFailure(reason);
      setUpload({ status: 'error', message });
    }
  };

  const replacing = card.collected || (draw.status === 'ready' && draw.draw.locked);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} aria-label={`${replacing ? 'Change the photo' : 'Photo challenge'} for the ${name}`}>
        <span aria-hidden="true">📷</span> {replacing ? 'Change' : 'Photo'}
      </button>

      <Modal open={draw.status !== 'closed'} onClose={close} title={`Photo challenge · ${name}`}>
        {draw.status === 'drawing' && (
          <p className={styles.muted} role="status">
            Drawing your scene…
          </p>
        )}

        {draw.status === 'error' && (
          <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
            {draw.message}
          </p>
        )}

        {draw.status === 'ready' && upload.status === 'done' && (
          <div className={styles.done} role="status">
            <p className={styles.doneTitle}>Photo uploaded! 🎉</p>
            <p>You collected the {name}. Everyone can now see it in the gallery.</p>
            <button type="button" className={formStyles.submit} onClick={close}>
              Back to the cards
            </button>
          </div>
        )}

        {draw.status === 'ready' && upload.status !== 'done' && (
          <form className={styles.form} onSubmit={submit}>
            <figure className={styles.scene}>
              <figcaption className={styles.sceneLabel}>Your scene</figcaption>
              <blockquote className={styles.sceneText}>{draw.draw.scene}</blockquote>
            </figure>

            <p className={styles.muted}>
              {draw.draw.locked
                ? 'You already uploaded a photo for this scene: the scene stays the same, you can only replace the photo.'
                : 'Catch this scene in a photo and upload it. Closing this window draws a new scene next time!'}
            </p>

            {(preview ?? draw.draw.photoUrl) && (
              <img
                className={styles.preview}
                src={preview ?? draw.draw.photoUrl ?? undefined}
                alt={preview ? 'The photo you selected' : 'Your current photo'}
              />
            )}

            <input
              id={inputId}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={choose}
            />
            <label htmlFor={inputId} className={formStyles.secondary}>
              {file ? 'Choose another photo' : draw.draw.locked ? 'Choose a new photo' : 'Take or choose a photo'}
            </label>

            {upload.status === 'error' && (
              <p role="alert" className={styles.error}>
                {upload.message}
              </p>
            )}

            <button type="submit" className={formStyles.submit} disabled={!file || upload.status === 'uploading'}>
              {upload.status === 'uploading' ? 'Uploading…' : 'Upload photo'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
