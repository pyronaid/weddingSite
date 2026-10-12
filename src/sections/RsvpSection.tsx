import { CardHeader } from '../components/InfoCard/CardHeader';
import { RsvpForm } from '../components/RsvpForm/RsvpForm';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import type { SectionPhotos } from '../config/wedding';
import { formatDeadline } from '../lib/format';
import type { RsvpRepository } from '../services/rsvp';
import styles from './sections.module.css';

interface RsvpSectionProps {
  deadline: string;
  maxGuests: number;
  repository: RsvpRepository;
  photos: SectionPhotos;
}

export function RsvpSection({ deadline, maxGuests, repository, photos }: RsvpSectionProps) {
  return (
    <ScrollSection id="rsvp" photos={photos}>
      <div aria-labelledby="rsvp-title" role="region">
        <CardHeader id="rsvp-title" eyebrow="RSVP" title="Will you join us?" />
        <p className={styles.text}>
          Please confirm your attendance by <strong>{formatDeadline(deadline)}</strong>.
        </p>
        <RsvpForm repository={repository} maxGuests={maxGuests} />
      </div>
    </ScrollSection>
  );
}
