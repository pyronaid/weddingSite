import { useMemo } from 'react';
import { Footer } from '../components/Footer/Footer';
import { Hero } from '../components/Hero/Hero';
import { wedding } from '../config/wedding';
import { formatWeddingDate } from '../lib/format';
import { DateSection } from '../sections/DateSection';
import { GiftSection } from '../sections/GiftSection';
import { LocationSection } from '../sections/LocationSection';
import { RsvpSection } from '../sections/RsvpSection';
import { createRsvpRepository } from '../services/rsvp';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function HomePage() {
  useDocumentTitle();
  // Created once; components receive it via props (easy to mock in tests).
  const rsvpRepository = useMemo(() => createRsvpRepository(), []);
  const { couple, location, photos } = wedding;
  const venues = [location.ceremony, ...(location.reception ? [location.reception] : [])];

  return (
    <>
      <Hero
        photo={wedding.heroPhoto}
        partnerOne={couple.partnerOne}
        partnerTwo={couple.partnerTwo}
        tagline={wedding.heroTagline}
        dateLabel={formatWeddingDate(wedding.date)}
      />
      <main>
        <DateSection dateIso={wedding.date} photos={photos.date} />
        <LocationSection venues={venues} photos={photos.location} />
        <RsvpSection
          deadline={wedding.rsvp.deadline}
          maxGuests={wedding.rsvp.maxGuests}
          repository={rsvpRepository}
          photos={photos.rsvp}
        />
        <GiftSection gift={wedding.gift} photos={photos.gift} />
      </main>
      <Footer
        coupleNames={`${couple.partnerOne} & ${couple.partnerTwo}`}
        hashtag={couple.hashtag}
      />
    </>
  );
}
