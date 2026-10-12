import { CardHeader } from '../components/InfoCard/CardHeader';
import { IbanCard } from '../components/IbanCard/IbanCard';
import { ScrollSection } from '../components/ScrollSection/ScrollSection';
import type { SectionPhotos, WeddingConfig } from '../config/wedding';
import styles from './sections.module.css';

interface GiftSectionProps {
  gift: WeddingConfig['gift'];
  photos: SectionPhotos;
}

export function GiftSection({ gift, photos }: GiftSectionProps) {
  const { message, ...bankDetails } = gift;
  return (
    <ScrollSection id="gift" photos={photos}>
      <div aria-labelledby="gift-title" role="region">
        <CardHeader id="gift-title" eyebrow="Gift" title="With love" />
        <p className={styles.text}>{message}</p>
        <IbanCard {...bankDetails} />
      </div>
    </ScrollSection>
  );
}
