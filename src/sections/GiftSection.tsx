import { CardHeader } from '../components/InfoCard/CardHeader';
import { IbanCard } from '../components/IbanCard/IbanCard';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import { useMessages } from '../i18n';
import { homeMessages } from '../pages/homeMessages';
import type { GiftDetails, SectionPhotos } from '../services/site/types';
import styles from './sections.module.css';

interface GiftSectionProps {
  gift: GiftDetails;
  photos: SectionPhotos;
}

export function GiftSection({ gift, photos }: GiftSectionProps) {
  const t = useMessages(homeMessages).gift;
  const { message, ...bankDetails } = gift;
  return (
    <ScrollSection id="gift" photos={photos}>
      <div aria-labelledby="gift-title" role="region">
        <CardHeader id="gift-title" eyebrow={t.eyebrow} title={t.title} />
        {message && <p className={styles.text}>{message}</p>}
        <IbanCard {...bankDetails} />
      </div>
    </ScrollSection>
  );
}
