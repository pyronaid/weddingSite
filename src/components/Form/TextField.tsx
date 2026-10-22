import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useMessages } from '../../i18n';
import { componentMessages } from '../componentMessages';
import styles from './Form.module.css';

interface BaseFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email';
}

/** Ids + aria attributes shared by every field type. */
function useFieldA11y(name: string, error?: string, hint?: ReactNode) {
  const uid = useId();
  const id = `${uid}-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return { id, errorId, hintId, inputAria: { 'aria-invalid': !!error, 'aria-describedby': describedBy } };
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  errorId: string;
  hint?: ReactNode;
  hintId: string;
  children: ReactNode;
}

function FieldShell({ id, label, error, errorId, hint, hintId, children }: FieldShellProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}

/** Labelled input with accessible error wiring (aria-invalid + aria-describedby). */
export function TextField({ label, name, error, hint, type = 'text', ...inputProps }: TextFieldProps) {
  const { id, errorId, hintId, inputAria } = useFieldA11y(name, error, hint);
  return (
    <FieldShell id={id} label={label} error={error} errorId={errorId} hint={hint} hintId={hintId}>
      <input id={id} name={name} type={type} {...inputAria} {...inputProps} />
    </FieldShell>
  );
}

/** Password input with a show/hide toggle (reduces typos on mobile). */
export function PasswordField({ label, name, error, hint, ...inputProps }: BaseFieldProps) {
  const [visible, setVisible] = useState(false);
  const t = useMessages(componentMessages);
  const { id, errorId, hintId, inputAria } = useFieldA11y(name, error, hint);
  return (
    <FieldShell id={id} label={label} error={error} errorId={errorId} hint={hint} hintId={hintId}>
      <div className={styles.passwordWrap}>
        <input id={id} name={name} type={visible ? 'text' : 'password'} {...inputAria} {...inputProps} />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={t.toggle(visible, label)}
        >
          {visible ? t.hide : t.show}
        </button>
      </div>
    </FieldShell>
  );
}
