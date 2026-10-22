import { CardHeader } from '../components/InfoCard/CardHeader';
import { RsvpForm } from '../components/RsvpForm/RsvpForm';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import { LOCALES, useLanguage, useMessages } from '../i18n';
import { formatDeadline } from '../lib/format';
import { homeMessages } from '../pages/homeMessages';
import type { RsvpRepository } from '../services/rsvp';
import type { SectionPhotos } from '../services/site/types';
import styles from './sections.module.css';

interface RsvpSectionProps {
  deadline: string;
  maxGuests: number;
  repository: RsvpRepository;
  photos: SectionPhotos;
}

export function RsvpSection({ deadline, maxGuests, repository, photos }: RsvpSectionProps) {
  const t = useMessages(homeMessages).rsvp;
  const locale = LOCALES[useLanguage()];
  return (
    <ScrollSection id="rsvp" photos={photos}>
      <div aria-labelledby="rsvp-title" role="region">
        <CardHeader id="rsvp-title" eyebrow={t.eyebrow} title={t.title} />
        <p className={styles.text}>
          {t.confirmBy} <strong>{formatDeadline(deadline, locale)}</strong>.
        </p>
        <RsvpForm repository={repository} maxGuests={maxGuests} />
      </div>
    </ScrollSection>
  );
}
