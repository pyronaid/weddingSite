import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import type { Photo, SectionPhotos } from '../../config/wedding';
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
 */
const IN_OUT = [0.05, 0.3, 0.7, 0.95];

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
        <AnimatedPhoto photo={photos.left} side="left" progress={progress} disabled={!!reduceMotion} />

        <motion.div
          className={styles.card}
          style={reduceMotion ? undefined : { opacity: cardOpacity, y: cardY }}
        >
          {children}
        </motion.div>

        <AnimatedPhoto photo={photos.right} side="right" progress={progress} disabled={!!reduceMotion} />
      </div>
    </section>
  );
}

interface AnimatedPhotoProps {
  photo: Photo;
  side: 'left' | 'right';
  progress: MotionValue<number>;
  disabled: boolean;
}

function AnimatedPhoto({ photo, side, progress, disabled }: AnimatedPhotoProps) {
  const direction = side === 'left' ? -1 : 1;
  const x = useTransform(progress, IN_OUT, [`${140 * direction}%`, '0%', '0%', `${140 * direction}%`]);
  const rotate = useTransform(progress, IN_OUT, [12 * direction, 4 * direction, -2 * direction, -12 * direction]);
  const opacity = useTransform(progress, IN_OUT, [0, 1, 1, 0]);

  return (
    <motion.figure
      className={`${styles.photo} ${styles[side]}`}
      style={disabled ? undefined : { x, rotate, opacity }}
    >
      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
    </motion.figure>
  );
}
