import { useState, type FormEvent, type ReactNode } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { TextField } from '../../../components/Form/TextField';
import { toAdminError, type AdminError, type AdminRepository, type AdminSettings } from '../../../services/admin';
import { useMessages } from '../../../i18n';
import { adminMessages } from '../messages/admin';
import { useAdminRepository } from './AdminRepositoryContext';
import { useAdminQuery } from './useAdminQuery';
import styles from './admin.module.css';

const loadSettings = (repository: AdminRepository) => repository.getSettings();

/**
 * The sign-up secret codes: the guests' one, and the one that makes the new
 * account a super admin (empty: closed). Each is saved on its own; the server
 * checks them as a pair (the two must differ).
 */
export function SignupCodeForm() {
  const messages = useMessages(adminMessages);
  const t = messages.signupCode;
  const settings = useAdminQuery(loadSettings);
  // The codes as last saved here (the query keeps the ones first loaded).
  const [latest, setLatest] = useState<AdminSettings | null>(null);
  const current = latest ?? (settings.status === 'success' ? settings.data : null);

  if (settings.status === 'error') {
    return (
      <section className={styles.panel} aria-labelledby="signup-code-title">
        <h3 id="signup-code-title" className={styles.panelTitle}>
          {t.title}
        </h3>
        <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {settings.error.message}
        </p>
      </section>
    );
  }

  return (
    <>
      <CodeForm
        id="signup-code"
        field="signupCode"
        title={t.title}
        label={t.label}
        hint={t.hint}
        save={t.save}
        current={current}
        onSaved={setLatest}
      />
      <CodeForm
        id="superadmin-signup-code"
        field="superAdminSignupCode"
        title={t.superAdmin.title}
        label={t.superAdmin.label}
        hint={t.superAdmin.hint}
        save={t.superAdmin.save}
        current={current}
        onSaved={setLatest}
        allowEmpty
        note={(value) => (
          <>
            <p className={`${formStyles.notice} ${formStyles.noticeError}`}>{t.superAdmin.warning}</p>
            {value.trim() === '' && <p className={formStyles.hint}>{t.superAdmin.closed}</p>}
          </>
        )}
      />
    </>
  );
}

interface CodeFormProps {
  id: string;
  field: keyof AdminSettings;
  title: string;
  label: string;
  hint: string;
  save: string;
  /** null while loading. */
  current: AdminSettings | null;
  onSaved: (settings: AdminSettings) => void;
  /** Empty is a valid value (it closes this way in). */
  allowEmpty?: boolean;
  /** Shown above the field, given what is typed. */
  note?: (value: string) => ReactNode;
}

/** One code: its field, its save button, its errors. */
function CodeForm({ id, field, title, label, hint, save, current, onSaved, allowEmpty = false, note }: CodeFormProps) {
  const repository = useAdminRepository();
  const messages = useMessages(adminMessages);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const stored = current?.[field] ?? '';
  const value = draft ?? stored;
  const unchanged = value.trim() === stored;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await repository.updateSettings({ [field]: value.trim() });
      onSaved(result);
      setDraft(null);
      setSaved(true);
    } catch (reason) {
      setError(toAdminError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.panelTitle}>
        {title}
      </h3>
      {note && <div className={styles.codeNote}>{note(value)}</div>}
      <form className={styles.inline} onSubmit={submit} noValidate>
        <TextField
          label={label}
          name={field}
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={current === null}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          error={error ? (error.fieldErrors[field] ?? error.message) : undefined}
          hint={hint}
        />
        <button
          type="submit"
          className={formStyles.submit}
          disabled={saving || unchanged || (!allowEmpty && value.trim() === '')}
        >
          {saving ? messages.common.saving : save}
        </button>
        <p className={styles.saved} role="status">
          {saved && messages.common.saved}
        </p>
      </form>
    </section>
  );
}
