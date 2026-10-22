import { Countdown } from '../components/Countdown/Countdown';
import { CardHeader } from '../components/InfoCard/CardHeader';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import { LOCALES, useLanguage, useMessages } from '../i18n';
import { formatWeddingDate } from '../lib/format';
import { homeMessages } from '../pages/homeMessages';
import type { SectionPhotos } from '../services/site/types';
import styles from './sections.module.css';

interface DateSectionProps {
  dateIso: string;
  /** The wedding's time zone: the day shown is the same for every guest. */
  timeZone: string;
  photos: SectionPhotos;
}

export function DateSection({ dateIso, timeZone, photos }: DateSectionProps) {
  const t = useMessages(homeMessages).date;
  const locale = LOCALES[useLanguage()];
  return (
    <ScrollSection id="date" photos={photos}>
      <div aria-labelledby="date-title" role="region">
        <CardHeader id="date-title" eyebrow={t.eyebrow} title={t.title} />
        <p className={styles.lead}>
          <time dateTime={dateIso}>{formatWeddingDate(dateIso, locale, timeZone)}</time>
        </p>
        <Countdown targetIso={dateIso} />
      </div>
    </ScrollSection>
  );
}
