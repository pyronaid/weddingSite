import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { Modal } from '../../../components/Modal/Modal';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { rankName, type GalleryPhoto } from '../../../services/game';
import { SUIT_META, suitPath } from '../game/suits';
import { useGalleryFeed } from '../game/useGalleryFeed';
import styles from './GalleryPage.module.css';

const cardLabel = (photo: GalleryPhoto) => `${rankName(photo.rank)} of ${SUIT_META[photo.suit].label.toLowerCase()}`;
const shortCard = (photo: GalleryPhoto) =>
  `${photo.rank === 1 ? 'A' : photo.rank > 10 ? rankName(photo.rank)[0] : photo.rank}${SUIT_META[photo.suit].symbol}`;

/** Photos of every player, newest first, refreshed automatically. */
export function GalleryPage() {
  useDocumentTitle('Gallery');
  const feed = useGalleryFeed();
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const { loadMore, hasMore } = feed;

  // Infinite scroll: load the next page shortly before reaching the end.
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: '600px 0px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="gallery-title" eyebrow="Photo challenge" title="Gallery" />
      <p className={styles.intro}>The scenes caught by everyone. New photos show up here by themselves.</p>

      <p className="visually-hidden" aria-live="polite">
        {feed.newCount > 0 && `${feed.newCount} new photo${feed.newCount === 1 ? '' : 's'}`}
      </p>

      {feed.status === 'loading' && (
        <p className={styles.status} role="status">
          Developing the photos…
        </p>
      )}

      {feed.status === 'error' && feed.error && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {feed.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={feed.retry}>
            Try again
          </button>
        </div>
      )}

      {feed.status === 'ready' && feed.photos.length === 0 && (
        <p className={`${formStyles.notice} ${styles.status}`}>No photos yet: be the first to catch a scene! 📷</p>
      )}

      {feed.photos.length > 0 && (
        <ul className={styles.grid} aria-label="Photos">
          {feed.photos.map((photo) => (
            <li key={photo.id} className={styles.item}>
              <button
                type="button"
                className={styles.tile}
                onClick={() => setSelected(photo)}
                aria-label={`${photo.scene}, by ${photo.player} (${cardLabel(photo)})`}
              >
                <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" width={480} height={480} />
                <span className={styles.caption} aria-hidden="true">
                  <span className={styles.badge}>{shortCard(photo)}</span> {photo.player}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {feed.hasMore && (
        <div ref={sentinel} className={styles.more}>
          <button type="button" className={formStyles.secondary} onClick={feed.loadMore} disabled={feed.loadingMore}>
            {feed.loadingMore ? 'Loading…' : 'Load more photos'}
          </button>
        </div>
      )}

      <Link to={suitPath('hearts')} className={formStyles.secondary}>
        ← Back to the hearts
      </Link>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.scene ?? ''} size="wide">
        {selected && (
          <figure className={styles.large}>
            <img src={selected.largeUrl} alt={selected.scene} />
            <figcaption>
              Caught by <strong>{selected.player}</strong> · {cardLabel(selected)}
            </figcaption>
          </figure>
        )}
      </Modal>
    </div>
  );
}
