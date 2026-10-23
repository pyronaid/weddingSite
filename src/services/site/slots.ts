import { AREA_PHOTO_COUNT, PHOTO_SECTIONS, type Photo, type PhotoSection, type PhotoSlot, type SectionPhotos } from './types';

export const sectionSlot = (section: PhotoSection, side: 'left' | 'right', position: 1 | 2): PhotoSlot =>
  `${section}-${side}-${position}`;

export const AREA_SLOTS = Array.from({ length: AREA_PHOTO_COUNT }, (_, i) => `area-${i + 1}` as PhotoSlot);

/** Every slot, in the order the super admin sees them. */
export const PHOTO_SLOTS: PhotoSlot[] = [
  'hero',
  ...PHOTO_SECTIONS.flatMap((section) =>
    (['left', 'right'] as const).flatMap((side) => ([1, 2] as const).map((position) => sectionSlot(section, side, position))),
  ),
  ...AREA_SLOTS,
];

export const isPhotoSlot = (value: string): value is PhotoSlot => (PHOTO_SLOTS as string[]).includes(value);

/** The four photos around a section of the public page. */
export function sectionPhotos(photos: Record<PhotoSlot, Photo>, section: PhotoSection): SectionPhotos {
  const pair = (side: 'left' | 'right') =>
    [photos[sectionSlot(section, side, 1)], photos[sectionSlot(section, side, 2)]] as const;
  return { left: pair('left'), right: pair('right') };
}

export const areaPhotos = (photos: Record<PhotoSlot, Photo>): Photo[] => AREA_SLOTS.map((slot) => photos[slot]);
