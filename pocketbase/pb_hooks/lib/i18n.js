/// <reference path="../../pb_data/types.d.ts" />

/**
 * Messages the hooks send to the guests, in the language chosen by the super
 * admin (site_content.language). Loaded with require().
 *
 *   const { t } = require(`${__hooks}/lib/i18n.js`);
 *   throw new BadRequestError(t(app, 'photo_missing'));
 *
 * `{name}` placeholders are filled from `params`. A key missing in a language
 * falls back to English, then to the key itself (never an empty message).
 */

const LANGUAGES = ['en', 'it'];

const MESSAGES = {
  en: {
    check_fields: 'Please check the highlighted fields.',
    // Sign-up
    secret_code_wrong: 'This secret code is not correct.',
    secret_code_missing: 'Please enter the secret code.',
    secret_code_length: 'The secret code must be 3 to 50 characters long.',
    // RSVP
    rsvp_guests_not_attending: 'Guests must be 0 when not attending.',
    rsvp_guests_attending: 'At least 1 guest is required when attending.',
    // Cards
    card_not_found: 'Card not found.',
    photo_missing: 'Please choose a photo to upload.',
    photo_too_small: 'This file is too small to be a photo.',
    // Hearts
    no_photo_challenge: 'This card has no photo challenge.',
    no_scenes: 'No scenes for this card yet.',
    // Clubs
    riddle_not_found: 'Riddle not found.',
    riddle_not_ready: 'This riddle is not available yet.',
    // Diamonds
    no_quiz: 'This card has no quiz.',
    no_questions: 'No questions for this card yet.',
    choose_answer: 'Please choose one of the answers.',
    // Spades
    no_guess: 'This card has no "guess who" hint.',
    guess_nobody: 'The game is not ready yet: there is nobody to find.',
    guess_locked: 'This card is still locked: send the selfie of the previous card first.',
    guess_open_first: 'Open the card to read its hint first.',
    selfie_invalid: 'This selfie cannot be saved: use a JPEG, PNG or WebP photo under 10 MB.',
    selfie_missing: 'Please choose a selfie to upload.',
    selfie_ace: 'The Ace needs a selfie of its own.',
    guess_too_early: 'Collect all the spades before guessing.',
    // Organisers
    admins_only: 'Only the organisers can do this.',
    not_found: 'Not found.',
    unknown_suit: 'Unknown suit.',
    face_no_letter: 'Jack, Queen and King have no letter.',
    spades_no_letter: 'Spades have no letters: they are a "guess who" game.',
    clubs_only: 'Only clubs have riddles.',
    hearts_only: 'Only the numbered hearts have scenes.',
    diamonds_only: 'Only diamonds have quiz questions.',
    question_answers: 'A question needs at least {min} answers, none of them empty.',
    one_correct: 'Mark exactly one answer as the correct one.',
    keep_correct: 'Choose the new correct answer instead: a question always has one.',
    delete_correct: 'Choose another correct answer before deleting this one.',
    min_answers: 'A question needs at least {min} answers.',
    person_name: 'Please write the name and the surname.',
    person_hints: 'Please write all the {count} hints, one per card.',
    person_in_use: 'This person is already being looked for by some guests: edit it instead.',
    // Site content (super admin)
    iban_invalid: 'This IBAN is not valid: check it again.',
    bic_invalid: 'A BIC has 8 or 11 letters and digits.',
    date_invalid: 'Please choose a valid date and time.',
    timezone_invalid: 'Unknown time zone.',
    reception_incomplete: 'Give the reception an address and a time too (or remove its name).',
    photo_slot_invalid: 'Unknown photo position.',
  },
  it: {
    check_fields: 'Controlla i campi evidenziati.',
    secret_code_wrong: 'Il codice segreto non è corretto.',
    secret_code_missing: 'Inserisci il codice segreto.',
    secret_code_length: 'Il codice segreto deve avere da 3 a 50 caratteri.',
    rsvp_guests_not_attending: 'Se non partecipi, gli ospiti devono essere 0.',
    rsvp_guests_attending: 'Se partecipi serve almeno 1 ospite.',
    card_not_found: 'Carta non trovata.',
    photo_missing: 'Scegli una foto da caricare.',
    photo_too_small: 'Questo file è troppo piccolo per essere una foto.',
    no_photo_challenge: 'Questa carta non ha una sfida fotografica.',
    no_scenes: 'Questa carta non ha ancora scene.',
    riddle_not_found: 'Indovinello non trovato.',
    riddle_not_ready: 'Questo indovinello non è ancora disponibile.',
    no_quiz: 'Questa carta non ha un quiz.',
    no_questions: 'Questa carta non ha ancora domande.',
    choose_answer: 'Scegli una delle risposte.',
    no_guess: 'Questa carta non ha un indizio di "Indovina chi".',
    guess_nobody: 'Il gioco non è ancora pronto: non c\'è nessuno da trovare.',
    guess_locked: 'Questa carta è ancora bloccata: prima invia il selfie della carta precedente.',
    guess_open_first: 'Prima apri la carta per leggere il suo indizio.',
    selfie_invalid: 'Questo selfie non può essere salvato: usa una foto JPEG, PNG o WebP sotto i 10 MB.',
    selfie_missing: 'Scegli un selfie da caricare.',
    selfie_ace: 'L\'Asso ha bisogno di un selfie tutto suo.',
    guess_too_early: 'Raccogli tutte le picche prima di indovinare.',
    admins_only: 'Solo gli organizzatori possono farlo.',
    not_found: 'Non trovato.',
    unknown_suit: 'Seme sconosciuto.',
    face_no_letter: 'Fante, Donna e Re non hanno una lettera.',
    spades_no_letter: 'Le picche non hanno lettere: sono il gioco "Indovina chi".',
    clubs_only: 'Solo i fiori hanno indovinelli.',
    hearts_only: 'Solo i cuori numerati hanno scene.',
    diamonds_only: 'Solo i quadri hanno domande del quiz.',
    question_answers: 'Una domanda ha bisogno di almeno {min} risposte, nessuna vuota.',
    one_correct: 'Segna esattamente una risposta come quella corretta.',
    keep_correct: 'Scegli invece la nuova risposta corretta: una domanda ne ha sempre una.',
    delete_correct: 'Scegli un\'altra risposta corretta prima di eliminare questa.',
    min_answers: 'Una domanda ha bisogno di almeno {min} risposte.',
    person_name: 'Scrivi il nome e il cognome.',
    person_hints: 'Scrivi tutti i {count} indizi, uno per carta.',
    person_in_use: 'Alcuni ospiti stanno già cercando questa persona: modificala invece di eliminarla.',
    iban_invalid: 'Questo IBAN non è valido: ricontrollalo.',
    bic_invalid: 'Un BIC ha 8 o 11 lettere e cifre.',
    date_invalid: 'Scegli una data e un\'ora valide.',
    timezone_invalid: 'Fuso orario sconosciuto.',
    reception_incomplete: 'Indica anche indirizzo e ora del ricevimento (oppure togline il nome).',
    photo_slot_invalid: 'Posizione della foto sconosciuta.',
  },
};

/** The site language ('en' when the content is missing or unreadable). */
function language(app) {
  try {
    const record = app.findRecordsByFilter('site_content', '', '', 1, 0)[0];
    const value = record ? record.getString('language') : '';
    return LANGUAGES.includes(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

function t(app, key, params) {
  const template = MESSAGES[language(app)][key] ?? MESSAGES.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (params && name in params ? String(params[name]) : match));
}

module.exports = { t, language, LANGUAGES };
