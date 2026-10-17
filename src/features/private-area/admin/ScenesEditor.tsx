import { useId, useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { toAdminError, type AdminScene } from '../../../services/admin';
import { useAdminRepository } from './AdminRepositoryContext';
import styles from './admin.module.css';

interface ScenesEditorProps {
  cardId: string;
  cardName: string;
  scenes: AdminScene[];
}

/** The bucket of photo scenes of a numbered hearts card: add, edit, delete. */
export function ScenesEditor({ cardId, cardName, scenes: initial }: ScenesEditorProps) {
  const repository = useAdminRepository();
  const newId = useId();
  const [scenes, setScenes] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newText, setNewText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (reason) {
      const failure = toAdminError(reason);
      setError(failure.fieldErrors.text ?? failure.message);
    } finally {
      setBusy(null);
    }
  };

  const save = (scene: AdminScene) =>
    run(scene.id, async () => {
      const updated = await repository.updateScene(scene.id, drafts[scene.id].trim());
      setScenes((list) => list.map((item) => (item.id === scene.id ? updated : item)));
      setDrafts(({ [scene.id]: _saved, ...rest }) => rest);
    });

  const remove = (scene: AdminScene) =>
    run(scene.id, async () => {
      await repository.deleteScene(scene.id);
      setScenes((list) => list.filter((item) => item.id !== scene.id));
      setConfirming(null);
    });

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!newText.trim()) return;
    void run('new', async () => {
      const created = await repository.addScene(cardId, newText.trim());
      setScenes((list) => [...list, created]);
      setNewText('');
    });
  };

  return (
    <div className={styles.scenes}>
      <p className={styles.subTitle}>
        Scenes <span className={styles.count}>({scenes.length})</span>
      </p>
      {scenes.length === 0 && <p className={styles.warning}>No scenes yet: guests cannot play this card.</p>}
      <ul className={styles.sceneList}>
        {scenes.map((scene, index) => {
          const draft = drafts[scene.id];
          const changed = draft !== undefined && draft.trim() !== scene.text;
          return (
            <li key={scene.id} className={styles.sceneRow}>
              <textarea
                aria-label={`Scene ${index + 1} of the ${cardName}`}
                rows={2}
                maxLength={300}
                value={draft ?? scene.text}
                onChange={(event) => setDrafts((all) => ({ ...all, [scene.id]: event.target.value }))}
              />
              <div className={styles.sceneActions}>
                <button
                  type="button"
                  className={formStyles.textButton}
                  disabled={!changed || busy !== null}
                  onClick={() => void save(scene)}
                  aria-label={`Save scene ${index + 1} of the ${cardName}`}
                >
                  Save scene
                </button>
                {confirming === scene.id ? (
                  <button
                    type="button"
                    className={`${formStyles.textButton} ${styles.danger}`}
                    disabled={busy !== null}
                    onClick={() => void remove(scene)}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    className={formStyles.textButton}
                    disabled={busy !== null}
                    onClick={() => setConfirming(scene.id)}
                    aria-label={`Delete scene ${index + 1} of the ${cardName}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form className={styles.sceneRow} onSubmit={add}>
        <label htmlFor={newId} className="visually-hidden">
          New scene for the {cardName}
        </label>
        <textarea
          id={newId}
          rows={2}
          maxLength={300}
          placeholder="New scene, e.g. “The bride's mother wearing sunglasses”"
          value={newText}
          onChange={(event) => setNewText(event.target.value)}
        />
        <div className={styles.sceneActions}>
          <button type="submit" className={formStyles.textButton} disabled={!newText.trim() || busy !== null}>
            {busy === 'new' ? 'Adding…' : 'Add scene'}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
