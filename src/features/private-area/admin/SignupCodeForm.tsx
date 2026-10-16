import { useState, type FormEvent } from 'react';
import formStyles from '../../../components/Form/Form.module.css';
import { TextField } from '../../../components/Form/TextField';
import { toAdminError, type AdminError, type AdminRepository } from '../../../services/admin';
import { useAdminRepository } from './AdminRepositoryContext';
import { useAdminQuery } from './useAdminQuery';
import styles from './admin.module.css';

const loadSettings = (repository: AdminRepository) => repository.getSettings();

/** The secret code guests must type to create an account. */
export function SignupCodeForm() {
  const repository = useAdminRepository();
  const settings = useAdminQuery(loadSettings);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const current = settings.status === 'success' ? settings.data.signupCode : '';
  const value = draft ?? current;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await repository.updateSettings({ signupCode: value.trim() });
      setDraft(result.signupCode);
      setSaved(true);
    } catch (reason) {
      setError(toAdminError(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="signup-code-title">
      <h3 id="signup-code-title" className={styles.panelTitle}>
        Sign-up secret code
      </h3>
      {settings.status === 'error' ? (
        <p role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {settings.error.message}
        </p>
      ) : (
        <form className={styles.inline} onSubmit={submit} noValidate>
          <TextField
            label="Code guests need to create an account"
            name="signupCode"
            autoComplete="off"
            spellCheck={false}
            value={value}
            disabled={settings.status === 'loading'}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
            error={error ? (error.fieldErrors.signupCode ?? error.message) : undefined}
            hint="Capital letters and spaces around it do not matter. Changing it does not affect existing accounts."
          />
          <button type="submit" className={formStyles.submit} disabled={saving || value.trim() === current}>
            {saving ? 'Saving…' : 'Save code'}
          </button>
          <p className={styles.saved} role="status">
            {saved && 'Saved ✓'}
          </p>
        </form>
      )}
    </section>
  );
}
