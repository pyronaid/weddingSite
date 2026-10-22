import type { ReactNode } from 'react';
import { useMessages, type Dictionary } from '../../../../i18n';
import type { Suit } from '../../../../services/game';
import { gameMessages } from '../../messages/game';
import styles from './SuitRules.module.css';

interface Rules {
  /** How the cards of each suit are collected. */
  suits: Record<Suit, ReactNode[]>;
  /** The road to the King, for every suit but the spades (which have their own). */
  progression: ReactNode[];
}

const en: Rules = {
  suits: {
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
      'For the Jack, Queen and King the question and its answers are told to you in person: on the site you only pick the letter (A, B, C…) of your answer.',
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
    spades: [
      <>
        <strong>Guess who!</strong> A guest has been secretly chosen for you: it is drawn when you open the Ace for
        the first time and stays the same for the whole game.
      </>,
      <>
        Press <span aria-hidden="true">🔍</span> under a card to read its hint, then find a guest who matches it and{' '}
        <strong>take a selfie with them</strong>: uploading it collects the card and unlocks the next one. The cards
        unlock in order, from the Ace to the King.
      </>,
      'Every card adds a new hint and keeps showing the previous ones: look for someone who matches all of them together.',
      <>
        If the person of your last selfie still matches the new hint, press <strong>Same person as before</strong>{' '}
        instead of taking a new selfie; otherwise take a selfie with someone who does. Once sent, a card's selfie
        cannot be changed.
      </>,
      <>
        With all 13 cards collected, write the <strong>name and surname</strong> of the person you think it is: the
        spades are complete only when you guess right (you can try again as many times as you need).
      </>,
      <>
        <strong>The selfies of whoever claims victory</strong> will be checked against the hints of their cards:
        selfies with people who do not match them do not count.
      </>,
    ],
  },
  progression: [
    <>
      Collect the first ten cards (Ace to 10): their letters spell <strong>the name of the Jack</strong>.
    </>,
    <>
      Find the Jack and pass his challenge to discover <strong>the name of the Queen</strong>; pass the Queen's
      challenge to discover the King's, until all 13 cards are yours.
    </>,
  ],
};

const RULES: Dictionary<Rules> = {
  en,
  it: {
    suits: {
      hearts: [
        <>
          Premi <span aria-hidden="true">📷</span> sotto una carta per avere la scena da fotografare, poi carica la tua
          foto per raccogliere la carta.
        </>,
        'Ogni volta che premi esce una scena nuova, finché non carichi una foto: da quel momento la scena resta fissa e puoi solo sostituire la foto.',
        'Per Fante, Donna e Re la scena ti viene detta di persona.',
        <>
          <strong>Tutte le foto di chi rivendica la vittoria</strong> (tutti i semi completati) verranno controllate
          con la scena assegnata: le foto che non corrispondono alla loro scena non valgono, quindi foto finte o fuori
          tema sono inutili.
        </>,
      ],
      clubs: [
        <>
          <strong>Tieni gli occhi aperti:</strong> i fiori sono nascosti nel luogo della festa, su poster con un codice
          QR.
        </>,
        'Inquadra un codice QR con il telefono, risolvi il suo indovinello e scrivi la risposta per raccogliere quella carta.',
      ],
      diamonds: [
        <>
          Premi <span aria-hidden="true">❓</span> sotto una carta per avere la sua domanda: riguardano tutte gli sposi,
          i loro gusti e gli aneddoti della loro vita insieme. Scegli una risposta e inviala.
        </>,
        'La tua domanda è estratta a caso e resta la stessa finché non rispondi, anche se la chiudi o torni più tardi.',
        'Per Fante, Donna e Re la domanda e le sue risposte ti vengono dette di persona: sul sito scegli solo la lettera (A, B, C…) della tua risposta.',
        <>
          <strong>Hai un dubbio? Chiedi agli altri invitati</strong>: amici e parenti potrebbero sapere la risposta!
        </>,
        <>
          Hai <strong>tre vite</strong> (i tre quadri qui sotto), condivise da tutti i quadri. Ogni risposta sbagliata
          costa una vita e ti dà una nuova domanda.
        </>,
        <>
          Finite le vite, ogni risposta sbagliata aggiunge una <strong>penitenza</strong> (i quadri di un altro colore).
          Se finisci il gioco con delle penitenze, dovrai <strong>farle prima di ritirare il premio</strong>: le
          sceglieranno gli sposi!
        </>,
      ],
      spades: [
        <>
          <strong>Indovina chi!</strong> Per te è stato scelto in segreto un invitato: viene estratto quando apri
          l’Asso per la prima volta e resta lo stesso per tutto il gioco.
        </>,
        <>
          Premi <span aria-hidden="true">🔍</span> sotto una carta per leggere il suo indizio, poi trova un invitato che
          corrisponda e <strong>fatti un selfie con lui o lei</strong>: caricarlo raccoglie la carta e sblocca la
          successiva. Le carte si sbloccano in ordine, dall’Asso al Re.
        </>,
        'Ogni carta aggiunge un nuovo indizio e continua a mostrare i precedenti: cerca qualcuno che li rispetti tutti insieme.',
        <>
          Se la persona del tuo ultimo selfie corrisponde anche al nuovo indizio, premi{' '}
          <strong>Stessa persona di prima</strong> invece di fare un nuovo selfie; altrimenti fatti un selfie con
          qualcuno che corrisponda. Una volta inviato, il selfie di una carta non si può cambiare.
        </>,
        <>
          Raccolte tutte le 13 carte, scrivi <strong>nome e cognome</strong> della persona che pensi sia: le picche
          sono complete solo quando indovini (puoi riprovare tutte le volte che vuoi).
        </>,
        <>
          <strong>I selfie di chi rivendica la vittoria</strong> verranno controllati con gli indizi delle loro carte:
          i selfie con persone che non corrispondono non valgono.
        </>,
      ],
    },
    progression: [
      <>
        Raccogli le prime dieci carte (dall’Asso al 10): le loro lettere formano <strong>il nome del Fante</strong>.
      </>,
      <>
        Trova il Fante e supera la sua sfida per scoprire <strong>il nome della Donna</strong>; supera la sfida della
        Donna per scoprire quello del Re, finché tutte le 13 carte non saranno tue.
      </>,
    ],
  },
};

/** Small-print rules box shown under the intro of every suit page. */
export function SuitRules({ suit }: { suit: Suit }) {
  const rules = useMessages(RULES);
  const t = useMessages(gameMessages).rules;
  const titleId = `${suit}-rules-title`;
  return (
    <section className={styles.rules} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        {t.title}
      </h3>
      <ul>
        {[...rules.suits[suit], ...(suit === 'spades' ? [] : rules.progression)].map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
