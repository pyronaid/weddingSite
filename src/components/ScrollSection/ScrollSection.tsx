import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import type { Photo, PhotoPair, SectionPhotos } from '../../config/wedding';
import styles from './ScrollSection.module.css';

interface ScrollSectionProps {
  id: string;
  photos: SectionPhotos;
  children: ReactNode;
}

/*
 * Scroll choreography (progress goes 0 -> 1 while the section crosses the viewport):
 *   0.00-0.30  photos slide in from the sides, card fades/rises in
 *   0.30-0.70  everything at rest, readable
 *   0.70-1.00  photos slide out again, card fades
 * The second photo of each pair is offset by STAGGER: it enters a bit later
 * and leaves a bit earlier, so the pair moves like a scattered collage.
 */
const IN_OUT = [0.05, 0.3, 0.7, 0.95] as const;
const STAGGER = 0.06;

export function ScrollSection({ id, photos, children }: ScrollSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // Spring smoothing hides the jitter of wheel/trackpad scroll events.
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const cardOpacity = useTransform(progress, [0.05, 0.25, 0.8, 0.98], [0, 1, 1, 0]);
  const cardY = useTransform(progress, [0.05, 0.3], [80, 0]);

  return (
    <section ref={ref} id={id} className={styles.section}>
      <div className={styles.layout}>
        <PhotoColumn photos={photos.left} side="left" progress={progress} disabled={!!reduceMotion} />

        <motion.div
          className={styles.card}
          style={reduceMotion ? undefined : { opacity: cardOpacity, y: cardY }}
        >
          {children}
        </motion.div>

        <PhotoColumn photos={photos.right} side="right" progress={progress} disabled={!!reduceMotion} />
      </div>
    </section>
  );
}

type Side = 'left' | 'right';

interface PhotoColumnProps {
  photos: PhotoPair;
  side: Side;
  progress: MotionValue<number>;
  disabled: boolean;
}

/** Desktop: a vertical pair beside the card. Mobile: a horizontal pair above/below it (see CSS). */
function PhotoColumn({ photos, side, progress, disabled }: PhotoColumnProps) {
  return (
    <div className={`${styles.column} ${styles[side]}`}>
      {photos.map((photo, index) => (
        <AnimatedPhoto
          key={`${photo.src}-${index}`}
          photo={photo}
          side={side}
          index={index}
          progress={progress}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface AnimatedPhotoProps {
  photo: Photo;
  side: Side;
  index: number;
  progress: MotionValue<number>;
  disabled: boolean;
}

function AnimatedPhoto({ photo, side, index, progress, disabled }: AnimatedPhotoProps) {
  const direction = side === 'left' ? -1 : 1;
  // Alternate the tilt inside a pair so the photos don't look aligned.
  const tilt = index % 2 === 0 ? 1 : -1;
  const delay = index * STAGGER;
  const keyframes = [IN_OUT[0] + delay, IN_OUT[1] + delay, IN_OUT[2] - delay, IN_OUT[3] - delay];

  const x = useTransform(progress, keyframes, [`${140 * direction}%`, '0%', '0%', `${140 * direction}%`]);
  const rotate = useTransform(progress, keyframes, [
    12 * direction * tilt,
    4 * direction * tilt,
    -2 * direction * tilt,
    -12 * direction * tilt,
  ]);
  const opacity = useTransform(progress, keyframes, [0, 1, 1, 0]);

  return (
    <motion.figure className={styles.photo} style={disabled ? undefined : { x, rotate, opacity }}>
      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
    </motion.figure>
  );
}
