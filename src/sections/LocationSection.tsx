import { CardHeader } from '../components/InfoCard/CardHeader';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import type { SectionPhotos, Venue } from '../config/wedding';
import { mapsDirectionsUrl, mapsEmbedUrl } from '../lib/format';
import styles from './sections.module.css';

interface LocationSectionProps {
  venues: Venue[];
  photos: SectionPhotos;
}

export function LocationSection({ venues, photos }: LocationSectionProps) {
  return (
    <ScrollSection id="location" photos={photos}>
      <div aria-labelledby="location-title" role="region">
        <CardHeader id="location-title" eyebrow="Where" title="Location" />
        <div className={styles.venues}>
          {venues.map((venue) => (
            <article key={venue.label} className={styles.venue}>
              <p className={styles.venueLabel}>
                {venue.label} · {venue.time}
              </p>
              <h3 className={styles.venueName}>{venue.name}</h3>
              <address className={styles.address}>{venue.address}</address>
              <iframe
                className={styles.map}
                title={`Map of ${venue.name}`}
                src={mapsEmbedUrl(venue.mapQuery)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className={styles.linkButton}
                href={mapsDirectionsUrl(venue.mapQuery)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
            </article>
          ))}
        </div>
      </div>
    </ScrollSection>
  );
}
