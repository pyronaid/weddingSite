import type { Language } from '../../i18n';

export interface Photo {
  src: string;
  /** Description for screen readers; empty for decorative photos. */
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

export const PHOTO_SECTIONS = ['date', 'location', 'rsvp', 'gift'] as const;
export type PhotoSection = (typeof PHOTO_SECTIONS)[number];
export const AREA_PHOTO_COUNT = 8;

/**
 * Where a photo goes: the big one at the top, two on each side of every
 * section, the ones floating in the private area. The server accepts the
 * same names (pb_hooks/site.pb.js).
 */
export type PhotoSlot =
  | 'hero'
  | `${PhotoSection}-${'left' | 'right'}-${1 | 2}`
  | `area-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface Venue {
  name: string;
  address: string;
  /** "16:00" */
  time: string;
  /** Free-text query for the embedded map and the directions link (the address when empty). */
  mapQuery: string;
}

export interface GiftDetails {
  message: string;
  accountHolder: string;
  iban: string;
  /** Optional: empty when not shown. */
  bic: string;
  bankName: string;
  paymentReason: string;
}

/** What the super admin edits, besides the photos. */
export interface SiteSettings {
  language: Language;
  couple: { partnerOne: string; partnerTwo: string; hashtag: string };
  tagline: string;
  /** ISO-8601 with the UTC offset, so the countdown is right in every time zone. */
  date: string;
  /** IANA time zone of the wedding (e.g. Europe/Rome): dates are shown in it. */
  timezone: string;
  /** YYYY-MM-DD */
  rsvpDeadline: string;
  ceremony: Venue;
  /** No reception: only the ceremony is shown. */
  reception: Venue | null;
  gift: GiftDetails;
}

export interface SiteContent extends SiteSettings {
  /** Every slot has a photo: an uploaded one or the default picture. */
  photos: Record<PhotoSlot, Photo>;
  /** Slots with an uploaded photo (the others show the default). */
  uploaded: PhotoSlot[];
}

/** Content of the public site, editable by the super admin. */
export interface SiteRepository {
  /** Anyone can read it (it is the public page). */
  load(): Promise<SiteContent>;
  /** Super admin only. Returns the content as saved (normalised by the server). */
  save(settings: SiteSettings): Promise<SiteContent>;
  /** Uploads (or replaces) the photo of a slot. */
  uploadPhoto(slot: PhotoSlot, image: Blob, alt: string): Promise<SiteContent>;
  updatePhotoAlt(slot: PhotoSlot, alt: string): Promise<SiteContent>;
  /** Back to the default picture. */
  resetPhoto(slot: PhotoSlot): Promise<SiteContent>;
}
