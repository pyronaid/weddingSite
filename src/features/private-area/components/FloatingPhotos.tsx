import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Photo } from '../../../config/wedding';
import styles from './FloatingPhotos.module.css';

/**
 * Slot positions in % of the viewport. Desktop slots surround the card;
 * on mobile only the slots with `mobile` coordinates are shown, peeking from
 * the top and bottom edges so the form stays fully readable.
 */
interface Slot {
  top: number;
  left: number;
  rotate: number;
  size: number;
  mobile?: { top: number; left: number };
}

const SLOTS: Slot[] = [
  { top: 8, left: 6, rotate: -8, size: 190, mobile: { top: -11, left: -6 } },
  { top: 52, left: 3, rotate: 6, size: 170, mobile: { top: 88, left: -8 } },
  { top: 12, left: 76, rotate: 7, size: 180, mobile: { top: -10, left: 64 } },
  { top: 56, left: 80, rotate: -5, size: 200, mobile: { top: 90, left: 66 } },
  { top: 72, left: 20, rotate: -3, size: 150 },
  // Kept clear of the top-center brand and of the card edges.
  { top: 3, left: 22, rotate: 4, size: 130 },
  { top: 76, left: 70, rotate: 9, size: 140 },
  { top: 34, left: 89, rotate: -10, size: 120 },
];

interface FloatingPhotosProps {
  photos: Photo[];
}

/** Purely decorative layer: hidden from assistive technologies. */
export function FloatingPhotos({ photos }: FloatingPhotosProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.layer} aria-hidden="true">
      {photos.slice(0, SLOTS.length).map((photo, index) => {
        const slot = SLOTS[index];
        // Deterministic per-photo variation so the float looks organic.
        const duration = 6 + (index % 4) * 1.3;
        const delay = index * 0.15;
        const style = {
          '--top': `${slot.top}%`,
          '--left': `${slot.left}%`,
          '--size': `${slot.size}px`,
          '--m-top': slot.mobile ? `${slot.mobile.top}%` : undefined,
          '--m-left': slot.mobile ? `${slot.mobile.left}%` : undefined,
        } as CSSProperties;

        return (
          <motion.figure
            key={`${photo.src}-${index}`}
            className={`${styles.photo} ${slot.mobile ? '' : styles.desktopOnly}`}
            style={style}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.85, rotate: slot.rotate }}
            animate={
              reduceMotion
                ? { opacity: 1, rotate: slot.rotate }
                : { opacity: 1, scale: 1, y: [0, -14, 0], rotate: [slot.rotate, slot.rotate + 2.5, slot.rotate] }
            }
            transition={{
              opacity: { duration: 0.8, delay },
              scale: { duration: 0.8, delay },
              y: { duration, delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: duration * 1.4, delay, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <img src={photo.src} alt="" loading="lazy" decoding="async" />
          </motion.figure>
        );
      })}
    </div>
  );
}
