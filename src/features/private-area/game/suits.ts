import type { Suit } from '../../../services/game';
import { AREA_HOME } from '../guards';

export interface SuitMeta {
  label: string;
  /** U+FE0E forces the text glyph: iOS would otherwise render an emoji. */
  symbol: string;
  colour: 'red' | 'black';
}

/** Presentation data for each suit; the order of SUITS sets the display order. */
export const SUIT_META: Record<Suit, SuitMeta> = {
  hearts: { label: 'Hearts', symbol: '♥︎', colour: 'red' },
  diamonds: { label: 'Diamonds', symbol: '♦︎', colour: 'red' },
  spades: { label: 'Spades', symbol: '♠︎', colour: 'black' },
  clubs: { label: 'Clubs', symbol: '♣︎', colour: 'black' },
};

export const suitPath = (suit: Suit) => `${AREA_HOME}/suits/${suit}`;
