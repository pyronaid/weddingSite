import type { Photo, PhotoSlot, SiteContent } from '../services/site/types';

/**
 * Default content of the site. The real content is edited by the super admin
 * from the site (private area → Site settings) and stored in PocketBase;
 * these values are shown only until it is loaded the first time, when no
 * backend is configured, or if it cannot be reached.
 * The default pictures live in /public/images.
 */

/** Most guests an RSVP can bring (also enforced by PocketBase). */
export const RSVP_MAX_GUESTS = 5;

const photo = (name: string, alt = ''): Photo => ({ src: `/images/${name}`, alt });

const DEFAULT_PHOTOS: Record<PhotoSlot, Photo> = {
  hero: photo('couple.svg', 'Giulia and Marco smiling together'),
  'date-left-1': photo('bride-1.svg', 'Giulia as a child'),
  'date-left-2': photo('bride-2.svg', 'Giulia at graduation'),
  'date-right-1': photo('groom-1.svg', 'Marco as a child'),
  'date-right-2': photo('groom-2.svg', 'Marco at graduation'),
  'location-left-1': photo('together-1.svg', 'Giulia and Marco on holiday'),
  'location-left-2': photo('bride-2.svg', 'Giulia laughing'),
  'location-right-1': photo('groom-1.svg', 'Marco at the beach'),
  'location-right-2': photo('together-2.svg', 'Our first trip'),
  'rsvp-left-1': photo('groom-2.svg', 'Marco hiking'),
  'rsvp-left-2': photo('bride-1.svg', 'Giulia reading'),
  'rsvp-right-1': photo('together-2.svg', 'The proposal'),
  'rsvp-right-2': photo('together-1.svg', 'Dancing together'),
  'gift-left-1': photo('bride-1.svg', 'Giulia'),
  'gift-left-2': photo('together-1.svg', 'Our home'),
  'gift-right-1': photo('groom-1.svg', 'Marco'),
  'gift-right-2': photo('together-2.svg', 'Dreaming of the honeymoon'),
  // Decorative: no description.
  'area-1': photo('together-1.svg'),
  'area-2': photo('bride-1.svg'),
  'area-3': photo('groom-2.svg'),
  'area-4': photo('together-2.svg'),
  'area-5': photo('bride-2.svg'),
  'area-6': photo('groom-1.svg'),
  'area-7': photo('together-1.svg'),
  'area-8': photo('bride-1.svg'),
};

/** The picture a slot shows when no photo was uploaded for it. */
export const defaultPhoto = (slot: PhotoSlot): Photo => DEFAULT_PHOTOS[slot];

export const defaultContent: SiteContent = {
  language: 'en',
  couple: { partnerOne: 'Giulia', partnerTwo: 'Marco', hashtag: '#GiuliaEMarco' },
  tagline: 'We are getting married',
  date: '2027-06-19T16:00:00+02:00',
  timezone: 'Europe/Rome',
  rsvpDeadline: '2027-04-30',
  ceremony: {
    name: 'Chiesa di San Pietro',
    address: 'Piazza San Pietro 1, 00120 Roma',
    time: '16:00',
    mapQuery: 'Piazza San Pietro, Roma',
  },
  reception: {
    name: 'Villa dei Fiori',
    address: 'Via dei Fiori 10, 00100 Roma',
    time: '19:00',
    mapQuery: 'Villa Borghese, Roma',
  },
  gift: {
    message:
      'Your presence is the most beautiful gift. If you would like to help us start our new life together, you can contribute to our honeymoon.',
    accountHolder: 'Giulia Rossi & Marco Bianchi',
    iban: 'IT60X0542811101000000123456',
    bic: 'BPMOIT22XXX',
    bankName: 'Banca Esempio',
    paymentReason: 'Wedding gift Giulia & Marco',
  },
  photos: DEFAULT_PHOTOS,
  uploaded: [],
};
