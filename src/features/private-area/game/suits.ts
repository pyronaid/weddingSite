import { suitName, type Suit } from '../../../services/game';
import { AREA_HOME } from '../guards';

export interface SuitMeta {
  label: string;
  /** U+FE0E forces the text glyph: iOS would otherwise render an emoji. */
  symbol: string;
  colour: 'red' | 'black';
}

/** Presentation data for each suit; the order of SUITS sets the display order. */
const meta = (suit: Suit, symbol: string, colour: SuitMeta['colour']): SuitMeta => ({
  // Read when used: the name follows the site language.
  get label() {
    return suitName(suit);
  },
  symbol,
  colour,
});

export const SUIT_META: Record<Suit, SuitMeta> = {
  hearts: meta('hearts', '♥︎', 'red'),
  diamonds: meta('diamonds', '♦︎', 'red'),
  spades: meta('spades', '♠︎', 'black'),
  clubs: meta('clubs', '♣︎', 'black'),
};

export const suitPath = (suit: Suit) => `${AREA_HOME}/suits/${suit}`;

/** Shared gallery of the photo challenge. */
export const GALLERY_PATH = `${AREA_HOME}/gallery`;

/** Super admin: content, language and photos of the public site. */
export const SITE_SETTINGS_PATH = `${AREA_HOME}/site`;

/** The tabs of the site settings, each at /area/site/<tab>. */
export const SETTINGS_TABS = ['general', 'photos', 'organisers', 'rsvps', 'signup-code'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
export const isSettingsTab = (value: unknown): value is SettingsTab =>
  typeof value === 'string' && (SETTINGS_TABS as readonly string[]).includes(value);
export const siteSettingsPath = (tab: SettingsTab) => `${SITE_SETTINGS_PATH}/${tab}`;

/** Organisers' editor of a suit. */
export const adminSuitPath = (suit: Suit) => `${AREA_HOME}/admin/suits/${suit}`;
