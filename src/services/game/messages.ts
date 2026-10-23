import type { Dictionary } from '../../i18n';
import type { GameErrorCode, Suit } from './types';

const en = {
  suits: { hearts: 'Hearts', diamonds: 'Diamonds', spades: 'Spades', clubs: 'Clubs' } satisfies Record<Suit, string>,
  /** Ranks with a name; the others are their number. */
  ranks: { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' } as Record<number, string>,
  /** "6 of spades" (the suit as returned by `suits`). */
  card: (rank: string, suit: string) => `${rank} of ${suit.toLowerCase()}`,
  errors: {
    unauthenticated: 'Your session has expired. Please log in again.',
    not_found: 'This riddle does not exist or is not available yet.',
    invalid_photo: 'This photo cannot be uploaded: use a JPEG, PNG or WebP image under 10 MB.',
    rejected: 'This cannot be done right now.',
    network: 'Unable to reach the server. Check your connection and try again.',
    not_configured: 'The game is not available yet.',
    unknown: 'Something went wrong. Please try again.',
  } satisfies Record<GameErrorCode, string>,
};

/** Card and suit names, and the game's error messages. */
export const cardMessages: Dictionary<typeof en> = {
  en,
  it: {
    suits: { hearts: 'Cuori', diamonds: 'Quadri', spades: 'Picche', clubs: 'Fiori' },
    ranks: { 1: 'Asso', 11: 'Fante', 12: 'Donna', 13: 'Re' },
    card: (rank, suit) => `${rank} di ${suit.toLowerCase()}`,
    errors: {
      unauthenticated: 'La sessione è scaduta. Accedi di nuovo.',
      not_found: 'Questo indovinello non esiste o non è ancora disponibile.',
      invalid_photo: 'Questa foto non può essere caricata: usa un’immagine JPEG, PNG o WebP sotto i 10 MB.',
      rejected: 'Al momento non è possibile farlo.',
      network: 'Impossibile raggiungere il server. Controlla la connessione e riprova.',
      not_configured: 'Il gioco non è ancora disponibile.',
      unknown: 'Qualcosa è andato storto. Riprova.',
    },
  },
};
