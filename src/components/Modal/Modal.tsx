import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Wider layout, e.g. for an enlarged photo. */
  size?: 'normal' | 'wide';
}

/**
 * Accessible modal built on the native <dialog>: focus is trapped and
 * restored, Esc closes it, the page behind is inert. Clicking the backdrop
 * or the × button closes it too. Content is mounted only while open.
 */
export function Modal({ open, onClose, title, children, size = 'normal' }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${size === 'wide' ? styles.wide : ''}`}
      aria-labelledby={titleId}
      // Esc (or the browser) closed it: keep React state in sync.
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === dialog.current) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
