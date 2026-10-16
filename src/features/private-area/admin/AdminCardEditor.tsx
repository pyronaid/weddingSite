import { useId, useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { toAdminError, type AdminCard, type AdminCardChanges, type AdminError } from '../../../services/admin';
import { cardImageUrl, isFaceCard, rankName } from '../../../services/game';
import { useAdminRepository } from './AdminRepositoryContext';
import { ScenesEditor } from './ScenesEditor';
import styles from './admin.module.css';

/** Edits one card: letter (Ace..10), riddle and solution (clubs), scenes (numbered hearts). */
export function AdminCardEditor({ card: initial }: { card: AdminCard }) {
  const repository = useAdminRepository();
  const uid = useId();
  const [card, setCard] = useState(initial);
  const [letter, setLetter] = useState(initial.letter);
  const [riddle, setRiddle] = useState(initial.riddle ?? '');
  const [solution, setSolution] = useState(initial.solution ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const face = isFaceCard(card.rank);
  const hasRiddle = card.riddle !== undefined;
  const name = `${rankName(card.rank)} of ${card.suit}`;

  // Only what changed is sent.
  const changes: AdminCardChanges = {};
  if (!face && letter.trim().toUpperCase() !== card.letter) changes.letter = letter;
  if (hasRiddle && riddle.trim() !== card.riddle) changes.riddle = riddle;
  if (hasRiddle && solution.replace(/\s+/g, '').toUpperCase() !== card.solution) changes.solution = solution;
  const dirty = Object.keys(changes).length > 0;
  const editable = !face || hasRiddle;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await repository.updateCard(card.id, changes);
      setCard(updated);
      setLetter(updated.letter);
      setRiddle(updated.riddle ?? '');
      setSolution(updated.solution ?? '');
      setSaved(true);
    } catch (reason) {
      setError(toAdminError(reason));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field: string) => error?.fieldErrors[field];
  // Editing clears the previous outcome (saved mark or errors).
  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setSaved(false);
    setError(null);
  };

  return (
    <article className={styles.editor} aria-labelledby={`${uid}-title`}>
      <header className={styles.editorHeader}>
        <img src={cardImageUrl(card.suit, card.rank)} alt="" width={40} height={56} />
        <h3 id={`${uid}-title`}>{name}</h3>
        {hasRiddle && !card.solution && <span className={styles.badge}>no solution yet</span>}
      </header>

      {editable ? (
        <form className={styles.fields} onSubmit={submit} noValidate>
          {!face && (
            <div className={`${formStyles.field} ${styles.letterField}`}>
              <label htmlFor={`${uid}-letter`}>Secret letter</label>
              <input
                id={`${uid}-letter`}
                value={letter}
                maxLength={1}
                autoComplete="off"
                autoCapitalize="characters"
                aria-invalid={!!fieldError('letter')}
                onChange={(event) => touch(setLetter)(event.target.value.toUpperCase())}
              />
              {fieldError('letter') && <span className={formStyles.error}>{fieldError('letter')}</span>}
            </div>
          )}

          {hasRiddle && (
            <>
              <div className={formStyles.field}>
                <label htmlFor={`${uid}-riddle`}>Riddle</label>
                <textarea
                  id={`${uid}-riddle`}
                  rows={3}
                  maxLength={2000}
                  value={riddle}
                  aria-invalid={!!fieldError('riddle')}
                  onChange={(event) => touch(setRiddle)(event.target.value)}
                />
                {fieldError('riddle') && <span className={formStyles.error}>{fieldError('riddle')}</span>}
              </div>
              <div className={formStyles.field}>
                <label htmlFor={`${uid}-solution`}>Solution</label>
                <input
                  id={`${uid}-solution`}
                  value={solution}
                  maxLength={24}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={!!fieldError('solution')}
                  aria-describedby={`${uid}-solution-hint`}
                  onChange={(event) => touch(setSolution)(event.target.value)}
                />
                <span id={`${uid}-solution-hint`} className={formStyles.hint}>
                  Letters and digits only (spaces are removed): one box each for the guests.
                </span>
                {fieldError('solution') && <span className={formStyles.error}>{fieldError('solution')}</span>}
              </div>
            </>
          )}

          <div className={styles.saveRow}>
            <button type="submit" className={formStyles.textButton} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <span role="status" className={styles.saved}>
              {saved && !dirty && 'Saved ✓'}
            </span>
          </div>
          {error && Object.keys(error.fieldErrors).length === 0 && (
            <p role="alert" className={styles.error}>
              {error.message}
            </p>
          )}
        </form>
      ) : (
        <p className={styles.note}>
          {card.suit === 'hearts' ? 'Its scene is told in person: nothing to set here.' : 'Face cards have no letter.'}
        </p>
      )}

      {card.scenes && <ScenesEditor cardId={card.id} cardName={name} scenes={card.scenes} />}
    </article>
  );
}
