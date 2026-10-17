import type { ReactNode } from 'react';
import type { Suit } from '../../../../services/game';
import styles from './SuitRules.module.css';

/** How the cards of each suit are collected. */
const SUIT_RULES: Record<Suit, ReactNode[]> = {
  hearts: [
    <>
      Press <span aria-hidden="true">📷</span> under a card to get the scene to photograph, then upload your photo to
      collect the card.
    </>,
    'Every press draws a new scene, until you upload a photo: from then on the scene is fixed and you can only replace the photo.',
    'For the Jack, Queen and King the scene is told to you in person.',
    <>
      <strong>Every photo of whoever claims victory</strong> (all suits completed) will be checked against the scene
      it was assigned: photos that do not match their scene do not count, so fake or unrelated pictures are useless.
    </>,
  ],
  clubs: [
    <>
      <strong>Keep your eyes open:</strong> the clubs are hidden around the venue as posters with a QR code.
    </>,
    'Scan a QR code with your phone, solve its riddle and type the answer to collect that card.',
  ],
  diamonds: [
    <>
      Press <span aria-hidden="true">❓</span> under a card to get its question: they are all about the newlyweds,
      their tastes and the anecdotes of their life together. Pick an answer and submit it.
    </>,
    'Your question is drawn at random and stays the same until you answer it, even if you close it or come back later.',
    <>
      <strong>Not sure? Ask the other guests</strong>: friends and relatives may know the answer!
    </>,
    <>
      You have <strong>three lives</strong> (the three diamonds below), shared by all the diamonds. Every wrong answer
      costs a life and gives you a new question.
    </>,
    <>
      With no lives left, every wrong answer adds a <strong>penalty</strong> (the diamonds of another colour). If you
      end the game with penalties, you will have to <strong>carry them out before claiming the prize</strong>: the
      bride and groom will choose them!
    </>,
  ],
  spades: ['Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'],
};

/** The road to the King, the same for every suit. */
const PROGRESSION_RULES: ReactNode[] = [
  <>
    Collect the first ten cards (Ace to 10): their letters spell <strong>the name of the Jack</strong>.
  </>,
  <>
    Find the Jack and pass his challenge to discover <strong>the name of the Queen</strong>; pass the Queen's challenge
    to discover the King's, until all 13 cards are yours.
  </>,
];

/** Small-print rules box shown under the intro of every suit page. */
export function SuitRules({ suit }: { suit: Suit }) {
  const titleId = `${suit}-rules-title`;
  return (
    <section className={styles.rules} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        Rules
      </h3>
      <ul>
        {[...SUIT_RULES[suit], ...PROGRESSION_RULES].map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
