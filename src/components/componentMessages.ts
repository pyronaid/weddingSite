import type { Dictionary } from '../i18n';

const en = {
  close: 'Close',
  show: 'Show',
  hide: 'Hide',
  /** "Show password" (the field label, lowercase). */
  toggle: (visible: boolean, label: string) => `${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`,
};

/** Texts of the shared components (modal, password field). */
export const componentMessages: Dictionary<typeof en> = {
  en,
  it: {
    close: 'Chiudi',
    show: 'Mostra',
    hide: 'Nascondi',
    toggle: (visible, label) => `${visible ? 'Nascondi' : 'Mostra'} ${label.toLowerCase()}`,
  },
};
