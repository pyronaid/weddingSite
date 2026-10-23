import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useMessages } from '../../i18n';
import { homeMessages } from '../../pages/homeMessages';
import type { Photo } from '../../services/site/types';
import styles from './Hero.module.css';

interface HeroProps {
  photo: Photo;
  partnerOne: string;
  partnerTwo: string;
  tagline: string;
  dateLabel: string;
}

export function Hero({ photo, partnerOne, partnerTwo, tagline, dateLabel }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const t = useMessages(homeMessages);

  // 0 when the hero top touches the viewport top, 1 when its bottom leaves it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-60%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <header ref={ref} className={styles.hero}>
      <motion.img
        className={styles.image}
        src={photo.src}
        alt={photo.alt}
        fetchPriority="high"
        style={reduceMotion ? undefined : { scale: imageScale, y: imageY }}
      />
      <div className={styles.overlay} aria-hidden="true" />

      <motion.div
        className={styles.content}
        style={reduceMotion ? undefined : { y: textY, opacity: textOpacity }}
        initial={reduceMotion ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        {tagline && <p className={styles.tagline}>{tagline}</p>}
        <h1 className={styles.names}>
          {partnerOne} <span className={styles.amp}>&amp;</span> {partnerTwo}
        </h1>
        <p className={styles.date}>{dateLabel}</p>
      </motion.div>

      <a href="#date" className={styles.scrollCue} aria-label={t.scrollCue}>
        <span />
      </a>
    </header>
  );
}
