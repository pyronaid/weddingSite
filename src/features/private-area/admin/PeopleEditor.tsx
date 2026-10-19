import { useCallback, useId, useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { toAdminError, type AdminPerson, type AdminRepository, type PersonFields } from '../../../services/admin';
import { rankName } from '../../../services/game';
import { useAdminRepository } from './AdminRepositoryContext';
import { useAdminQuery } from './useAdminQuery';
import styles from './admin.module.css';

const RANKS = 13;
const EMPTY: PersonFields = { firstName: '', lastName: '', hints: Array(RANKS).fill('') };
const loadPeople = (repository: AdminRepository) => repository.getPeople();

const fullName = (person: PersonFields) => `${person.firstName} ${person.lastName}`.trim();

/**
 * The people of the "guess who" game (spades): each player is given one of
 * them at random, and each card reveals one of its 13 hints.
 */
export function PeopleEditor() {
  const query = useAdminQuery(loadPeople);
  const repository = useAdminRepository();
  // Local changes on top of the loaded list.
  const [people, setPeople] = useState<AdminPerson[] | null>(null);
  const list = people ?? (query.status === 'success' ? query.data : []);
  const [adding, setAdding] = useState(0);

  const replace = (updated: AdminPerson) => setPeople(list.map((item) => (item.id === updated.id ? updated : item)));

  return (
    <section className={styles.people} aria-labelledby="people-title">
      <h3 id="people-title" className={styles.panelTitle}>
        Guess who: the people to find
      </h3>
      <p className={styles.hint}>
        Every guest is given one of these people at random when they open the Ace, and keeps it for the whole game.
        Each card reveals one more hint, from the Ace to the King: start from the vaguest one. Changes are live, also
        for the guests already looking for that person.
      </p>

      {query.status === 'loading' && (
        <p className={styles.help} role="status">
          Loading the people…
        </p>
      )}
      {query.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {query.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={query.retry}>
            Try again
          </button>
        </div>
      )}

      {query.status === 'success' && (
        <>
          {list.length === 0 && <p className={styles.warning}>Nobody to find yet: guests cannot play the spades.</p>}
          {list.map((person) => (
            <details key={person.id} className={styles.person}>
              <summary>
                <strong>{fullName(person)}</strong>
                <span className={styles.count}>
                  {' '}
                  · given to {person.assigned} {person.assigned === 1 ? 'guest' : 'guests'}, found by {person.found}
                </span>
              </summary>
              <PersonForm
                initial={person}
                submitLabel="Save"
                onSubmit={async (fields) => replace(await repository.updatePerson(person.id, fields))}
                onDelete={
                  person.assigned === 0
                    ? async () => {
                        await repository.deletePerson(person.id);
                        setPeople(list.filter((item) => item.id !== person.id));
                      }
                    : undefined
                }
              />
            </details>
          ))}

          <details className={`${styles.person} ${styles.newPerson}`}>
            <summary>
              <strong>+ Add a person</strong>
            </summary>
            {/* Keyed: after an add the form starts empty again. */}
            <PersonForm
              key={adding}
              initial={EMPTY}
              submitLabel="Add person"
              onSubmit={async (fields) => {
                const created = await repository.addPerson(fields);
                setPeople([...list, created]);
                setAdding((n) => n + 1);
              }}
            />
          </details>
        </>
      )}
    </section>
  );
}

interface PersonFormProps {
  initial: PersonFields;
  submitLabel: string;
  onSubmit: (fields: PersonFields) => Promise<void>;
  /** Absent when the person cannot be deleted (already given to a guest). */
  onDelete?: () => Promise<void>;
}

function PersonForm({ initial, submitLabel, onSubmit, onDelete }: PersonFormProps) {
  const uid = useId();
  const [fields, setFields] = useState<PersonFields>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = (person: PersonFields) => ({
    firstName: person.firstName.trim(),
    lastName: person.lastName.trim(),
    hints: person.hints.map((hint) => hint.trim()),
  });
  const current = clean(fields);
  const dirty = JSON.stringify(current) !== JSON.stringify(clean(initial));
  const filled = Boolean(current.firstName && current.lastName) && current.hints.every(Boolean);

  const change = useCallback((update: (previous: PersonFields) => PersonFields) => {
    setFields(update);
    setSaved(false);
    setError(null);
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (reason) {
      setError(toAdminError(reason).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !filled || busy) return;
    if (await run(() => onSubmit(current))) setSaved(true);
  };

  return (
    <form className={styles.fields} onSubmit={submit} noValidate>
      <div className={styles.nameRow}>
        <div className={formStyles.field}>
          <label htmlFor={`${uid}-first`}>Name</label>
          <input
            id={`${uid}-first`}
            value={fields.firstName}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => change((previous) => ({ ...previous, firstName: event.target.value }))}
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor={`${uid}-last`}>Surname</label>
          <input
            id={`${uid}-last`}
            value={fields.lastName}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => change((previous) => ({ ...previous, lastName: event.target.value }))}
          />
        </div>
      </div>
      <p className={styles.hint}>
        Guests type them in letter boxes: spaces, apostrophes and accents are ignored (“D'Amico” is DAMICO).
      </p>

      <ol className={styles.hintList}>
        {fields.hints.map((hint, index) => (
          <li key={index} className={styles.hintRow}>
            <label htmlFor={`${uid}-hint-${index}`} className={styles.hintRank}>
              {rankName(index + 1)}
            </label>
            <textarea
              id={`${uid}-hint-${index}`}
              rows={1}
              maxLength={300}
              value={hint}
              placeholder={index === 0 ? 'e.g. “Wears glasses or contact lenses”' : undefined}
              onChange={(event) =>
                change((previous) => ({
                  ...previous,
                  hints: previous.hints.map((item, position) => (position === index ? event.target.value : item)),
                }))
              }
            />
          </li>
        ))}
      </ol>

      <div className={styles.saveRow}>
        <button type="submit" className={formStyles.textButton} disabled={!dirty || !filled || busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onDelete &&
          (confirming ? (
            <button
              type="button"
              className={`${formStyles.textButton} ${styles.danger}`}
              disabled={busy}
              onClick={() => void run(onDelete)}
            >
              Confirm delete
            </button>
          ) : (
            <button type="button" className={formStyles.textButton} disabled={busy} onClick={() => setConfirming(true)}>
              Delete
            </button>
          ))}
        <span role="status" className={styles.saved}>
          {saved && !dirty && 'Saved ✓'}
        </span>
      </div>
      {!filled && dirty && <p className={styles.hint}>Write the name, the surname and all the 13 hints to save.</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
