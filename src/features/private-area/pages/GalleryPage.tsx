import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { Modal } from '../../../components/Modal/Modal';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { useMessages } from '../../../i18n';
import { cardName, rankName, signFileUrl, type GalleryPhoto } from '../../../services/game';
import { SUIT_META, suitPath } from '../game/suits';
import { useFileToken } from '../game/useFileToken';
import { useGalleryFeed } from '../game/useGalleryFeed';
import { gameMessages } from '../messages/game';
import styles from './GalleryPage.module.css';

const cardLabel = (photo: GalleryPhoto) => cardName(photo.rank, photo.suit);
const shortCard = (photo: GalleryPhoto) =>
  `${photo.rank === 1 ? 'A' : photo.rank > 10 ? rankName(photo.rank)[0] : photo.rank}${SUIT_META[photo.suit].symbol}`;

/** Photos of every player, newest first, refreshed automatically. */
export function GalleryPage() {
  const t = useMessages(gameMessages);
  useDocumentTitle(t.gallery.documentTitle);
  const feed = useGalleryFeed();
  // Photos are protected files: every URL needs a (renewed) token.
  const { token, renew } = useFileToken();
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
      <CardHeader id="gallery-title" eyebrow={t.gallery.eyebrow} title={t.gallery.title} />
      <p className={styles.intro}>{t.gallery.intro}</p>

      <p className="visually-hidden" aria-live="polite">
        {feed.newCount > 0 && t.gallery.newPhotos(feed.newCount)}
      </p>

      {feed.status === 'loading' && (
        <p className={styles.status} role="status">
          {t.gallery.loading}
        </p>
      )}

      {feed.status === 'error' && feed.error && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {feed.error.message}{' '}
          <button type="button" className={formStyles.textButton} onClick={feed.retry}>
            {t.tryAgain}
          </button>
        </div>
      )}

      {feed.status === 'ready' && feed.photos.length === 0 && (
        <p className={`${formStyles.notice} ${styles.status}`}>{t.gallery.empty}</p>
      )}

      {feed.photos.length > 0 && (
        <ul className={styles.grid} aria-label={t.gallery.list}>
          {feed.photos.map((photo) => (
            <li key={photo.id} className={styles.item}>
              <button
                type="button"
                className={styles.tile}
                onClick={() => setSelected(photo)}
                aria-label={t.gallery.tile(photo.scene, photo.player, cardLabel(photo))}
              >
                {token && (
                  <img
                    src={signFileUrl(photo.thumbUrl, token)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={480}
                    height={480}
                    onError={renew}
                  />
                )}
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
            {feed.loadingMore ? t.gallery.loadingMore : t.gallery.loadMore}
          </button>
        </div>
      )}

      <Link to={suitPath('hearts')} className={formStyles.secondary}>
        {t.gallery.back}
      </Link>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.scene ?? ''} size="wide">
        {selected && (
          <figure className={styles.large}>
            {token && <img src={signFileUrl(selected.largeUrl, token)} alt={selected.scene} onError={renew} />}
            <figcaption>
              {t.gallery.caughtBy} <strong>{selected.player}</strong> · {cardLabel(selected)}
            </figcaption>
          </figure>
        )}
      </Modal>
    </div>
  );
}
