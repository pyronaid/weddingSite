import type { Dictionary } from '../../i18n';

const en = {
  nameMissing: 'Please tell us your name.',
  nameTooLong: 'Name is too long.',
  emailMissing: 'Please enter your e-mail.',
  emailInvalid: 'Please enter a valid e-mail.',
  attendingMissing: 'Please let us know if you can come.',
  textTooLong: 'Text is too long.',
  messageTooLong: 'Message is too long.',
  guestsRange: (max: number) => `Number of guests must be between 1 and ${max}.`,
  saveFailed: 'Unable to save your confirmation. Please try again later.',
};

/** Validation and submission messages of the RSVP (built when needed, in the site language). */
export const rsvpMessages: Dictionary<typeof en> = {
  en,
  it: {
    nameMissing: 'Dicci come ti chiami.',
    nameTooLong: 'Il nome è troppo lungo.',
    emailMissing: 'Inserisci la tua e-mail.',
    emailInvalid: 'Inserisci un’e-mail valida.',
    attendingMissing: 'Facci sapere se puoi venire.',
    textTooLong: 'Il testo è troppo lungo.',
    messageTooLong: 'Il messaggio è troppo lungo.',
    guestsRange: (max) => `Il numero di persone deve essere tra 1 e ${max}.`,
    saveFailed: 'Non è stato possibile salvare la conferma. Riprova più tardi.',
  },
};
