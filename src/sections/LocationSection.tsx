import { CardHeader } from '../components/InfoCard/CardHeader';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import { useMessages } from '../i18n';
import { mapsDirectionsUrl, mapsEmbedUrl } from '../lib/format';
import { homeMessages } from '../pages/homeMessages';
import type { SectionPhotos, Venue } from '../services/site/types';
import styles from './sections.module.css';

interface LocationSectionProps {
  ceremony: Venue;
  /** Hidden when there is no reception. */
  reception: Venue | null;
  photos: SectionPhotos;
}

export function LocationSection({ ceremony, reception, photos }: LocationSectionProps) {
  const t = useMessages(homeMessages).location;
  const venues = [
    { key: 'ceremony', label: t.ceremony, venue: ceremony },
    ...(reception ? [{ key: 'reception', label: t.reception, venue: reception }] : []),
  ];

  return (
    <ScrollSection id="location" photos={photos}>
      <div aria-labelledby="location-title" role="region">
        <CardHeader id="location-title" eyebrow={t.eyebrow} title={t.title} />
        <div className={styles.venues}>
          {venues.map(({ key, label, venue }) => (
            <article key={key} className={styles.venue}>
              <p className={styles.venueLabel}>
                {label} · {venue.time}
              </p>
              <h3 className={styles.venueName}>{venue.name}</h3>
              <address className={styles.address}>{venue.address}</address>
              <iframe
                className={styles.map}
                title={t.map(venue.name)}
                src={mapsEmbedUrl(venue.mapQuery || venue.address)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className={styles.linkButton}
                href={mapsDirectionsUrl(venue.mapQuery || venue.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.directions}
              </a>
            </article>
          ))}
        </div>
      </div>
    </ScrollSection>
  );
}
