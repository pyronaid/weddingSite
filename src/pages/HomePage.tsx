import { useMemo } from 'react';
import { Footer } from '../components/Footer/Footer';
import { Hero } from '../components/Hero/Hero';
import { RSVP_MAX_GUESTS } from '../config/wedding';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LOCALES, useLanguage } from '../i18n';
import { formatWeddingDate } from '../lib/format';
import { DateSection } from '../sections/DateSection';
import { GiftSection } from '../sections/GiftSection';
import { LocationSection } from '../sections/LocationSection';
import { RsvpSection } from '../sections/RsvpSection';
import { createRsvpRepository } from '../services/rsvp';
import { sectionPhotos } from '../services/site/slots';
import { useSiteContent } from '../site/SiteContentContext';

export function HomePage() {
  useDocumentTitle();
  // Created once; components receive it via props (easy to mock in tests).
  const rsvpRepository = useMemo(() => createRsvpRepository(), []);
  const { content } = useSiteContent();
  const locale = LOCALES[useLanguage()];
  const { couple, photos } = content;

  return (
    <>
      <Hero
        photo={photos.hero}
        partnerOne={couple.partnerOne}
        partnerTwo={couple.partnerTwo}
        tagline={content.tagline}
        dateLabel={formatWeddingDate(content.date, locale, content.timezone)}
      />
      <main>
        <DateSection dateIso={content.date} timeZone={content.timezone} photos={sectionPhotos(photos, 'date')} />
        <LocationSection
          ceremony={content.ceremony}
          reception={content.reception}
          photos={sectionPhotos(photos, 'location')}
        />
        <RsvpSection
          deadline={content.rsvpDeadline}
          maxGuests={RSVP_MAX_GUESTS}
          repository={rsvpRepository}
          photos={sectionPhotos(photos, 'rsvp')}
        />
        <GiftSection gift={content.gift} photos={sectionPhotos(photos, 'gift')} />
      </main>
      <Footer coupleNames={`${couple.partnerOne} & ${couple.partnerTwo}`} hashtag={couple.hashtag} />
    </>
  );
}
