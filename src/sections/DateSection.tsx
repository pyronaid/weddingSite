import { Countdown } from '../components/Countdown/Countdown';
import { CardHeader } from '../components/InfoCard/CardHeader';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import type { SectionPhotos } from '../config/wedding';
import { formatWeddingDate } from '../lib/format';
import styles from './sections.module.css';

interface DateSectionProps {
  dateIso: string;
  photos: SectionPhotos;
}

export function DateSection({ dateIso, photos }: DateSectionProps) {
  return (
    <ScrollSection id="date" photos={photos}>
      <div aria-labelledby="date-title" role="region">
        <CardHeader id="date-title" eyebrow="Save the date" title="The Big Day" />
        <p className={styles.lead}>
          <time dateTime={dateIso}>{formatWeddingDate(dateIso)}</time>
        </p>
        <Countdown targetIso={dateIso} />
      </div>
    </ScrollSection>
  );
}
