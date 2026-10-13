/**
 * Single source of truth for all the wedding content.
 * Edit this file (and the images in /public/images) to customise the site:
 * no component needs to be touched.
 */
export interface Photo {
  src: string;
  alt: string;
}

/** Exactly two photos per side: enforced by the type, not by convention. */
export type PhotoPair = readonly [Photo, Photo];

/**
 * Photos framing an info card.
 * Desktop: `left` pair on the left, `right` pair on the right.
 * Mobile:  `left` pair above the card, `right` pair below it.
 */
export interface SectionPhotos {
  left: PhotoPair;
  right: PhotoPair;
}

export interface WeddingConfig {
  couple: { partnerOne: string; partnerTwo: string; hashtag?: string };
  heroPhoto: Photo;
  heroTagline: string;
  /** ISO-8601 with explicit UTC offset, so the countdown is timezone-safe. */
  date: string;
  location: {
    ceremony: Venue;
    reception?: Venue;
  };
  rsvp: { deadline: string; maxGuests: number };
  gift: {
    message: string;
    accountHolder: string;
    iban: string;
    bic?: string;
    bankName?: string;
    paymentReason?: string;
  };
  photos: {
    date: SectionPhotos;
    location: SectionPhotos;
    rsvp: SectionPhotos;
    gift: SectionPhotos;
  };
}

export interface Venue {
  label: string;
  name: string;
  address: string;
  time: string;
  /** Free-text query used for the embedded map and the "open in maps" link. */
  mapQuery: string;
}

const photo = (name: string, alt: string): Photo => ({ src: `/images/${name}`, alt });

export const wedding: WeddingConfig = {
  couple: { partnerOne: 'Giulia', partnerTwo: 'Marco', hashtag: '#GiuliaEMarco' },
  heroPhoto: photo('couple.svg', 'Giulia and Marco smiling together'),
  heroTagline: 'We are getting married',
  date: '2027-06-19T16:00:00+02:00',
  location: {
    ceremony: {
      label: 'Ceremony',
      name: 'Chiesa di San Pietro',
      address: 'Piazza San Pietro 1, 00120 Roma',
      time: '16:00',
      mapQuery: 'Piazza San Pietro, Roma',
    },
    reception: {
      label: 'Reception',
      name: 'Villa dei Fiori',
      address: 'Via dei Fiori 10, 00100 Roma',
      time: '19:00',
      mapQuery: 'Villa Borghese, Roma',
    },
  },
  rsvp: { deadline: '2027-04-30', maxGuests: 5 },
  gift: {
    message:
      'Your presence is the most beautiful gift. If you would like to help us start our new life together, you can contribute to our honeymoon.',
    accountHolder: 'Giulia Rossi & Marco Bianchi',
    iban: 'IT60X0542811101000000123456',
    bic: 'BPMOIT22XXX',
    bankName: 'Banca Esempio',
    paymentReason: 'Wedding gift Giulia & Marco',
  },
  photos: {
    date: {
      left: [photo('bride-1.svg', 'Giulia as a child'), photo('bride-2.svg', 'Giulia at graduation')],
      right: [photo('groom-1.svg', 'Marco as a child'), photo('groom-2.svg', 'Marco at graduation')],
    },
    location: {
      left: [photo('together-1.svg', 'Giulia and Marco on holiday'), photo('bride-2.svg', 'Giulia laughing')],
      right: [photo('groom-1.svg', 'Marco at the beach'), photo('together-2.svg', 'Our first trip')],
    },
    rsvp: {
      left: [photo('groom-2.svg', 'Marco hiking'), photo('bride-1.svg', 'Giulia reading')],
      right: [photo('together-2.svg', 'The proposal'), photo('together-1.svg', 'Dancing together')],
    },
    gift: {
      left: [photo('bride-1.svg', 'Giulia'), photo('together-1.svg', 'Our home')],
      right: [photo('groom-1.svg', 'Marco'), photo('together-2.svg', 'Dreaming of the honeymoon')],
    },
  },
};
