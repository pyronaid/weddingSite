import type { ReactNode } from 'react';
import type { Dictionary } from '../../../i18n';
import { cardName, type Rank, type Suit } from '../../../services/game';

/**
 * Italian articles before a card name: "l'Asso", "l'8", "la Donna", "il Re".
 * `di` + article: "dell'Asso", "della Donna", "del Re".
 */
const itArticle = (rank: Rank) => (rank === 1 || rank === 8 ? 'l’' : rank === 12 ? 'la ' : 'il ');
const itOfArticle = (rank: Rank) => (rank === 1 || rank === 8 ? 'dell’' : rank === 12 ? 'della ' : 'del ');
const itThe = (rank: Rank, suit: Suit) => `${itArticle(rank)}${cardName(rank, suit)}`;
const itOfThe = (rank: Rank, suit: Suit) => `${itOfArticle(rank)}${cardName(rank, suit)}`;

const en = {
  tryAgain: 'Try again',
  submit: 'Submit',
  checking: 'Checking…',
  backToCards: 'Back to the cards',
  backToCollectionArrow: '← Back to your collection',
  backToCollection: 'Back to your collection',
  earnedStar: 'You earned a',
  yourLetter: 'Your letter:',

  collection: {
    eyebrow: (symbol: string) => `${symbol} Your collection`,
    introLetters:
      'Tap a card to flip it. Every card you collect hides a secret on its back: put the letters together to discover the secret phrase.',
    introStars: 'Tap a card to flip it: every card you collect shows a star on its back.',
    loading: 'Shuffling your cards…',
    collected: (count: number, total: number) => `${count}/${total} cards collected`,
    list: (suit: string) => `${suit} cards`,
  },
  phrase: {
    caption: 'Secret phrase',
    summary: (phrase: string, found: number, total: number) => `${phrase} — ${found} of ${total} letters found`,
    count: (found: number, total: number) => `${found}/${total} letters found`,
  },
  flip: {
    collected: ', collected',
    notCollected: ', not collected',
    showing: (back: string) => `, showing the ${back}`,
    back: 'card back',
    backStar: 'card back with a star',
    backLetter: (letter: string) => `card back with the letter ${letter}`,
  },
  suitCard: {
    collected: (count: number, total: number) => `${count} of ${total} cards collected`,
    unavailable: 'progress not available',
    personFound: 'person found',
    personNotFound: 'person not found yet',
    badgeFound: 'Person found ✓',
    badgeNotFound: 'Person not found',
  },
  rules: { title: 'Rules' },
  letters: {
    box: (label: string | undefined, index: number, count: number) =>
      `${label ? `${label} letter` : 'Letter'} ${index} of ${count}`,
  },
  lives: {
    region: 'Your lives',
    lives: 'Lives',
    penalties: 'Penalties',
    summary: (lives: number, max: number, penalties: number) =>
      `${lives} of ${max} lives left${penalties > 0 ? `, ${penalties} ${penalties === 1 ? 'penalty' : 'penalties'}` : ''}`,
  },
  photo: {
    trigger: (replacing: boolean, rank: Rank, suit: Suit) =>
      `${replacing ? 'Change the photo' : 'Photo challenge'} for the ${cardName(rank, suit)}`,
    title: (name: string) => `Photo challenge · ${name}`,
    drawing: 'Drawing your scene…',
    uploaded: 'Photo uploaded! 🎉',
    collected: (rank: Rank, suit: Suit) =>
      `You collected the ${cardName(rank, suit)}. Everyone can now see it in the gallery.`,
    yourScene: 'Your scene',
    locked: 'You already uploaded a photo for this scene: the scene stays the same, you can only replace the photo.',
    unlocked: 'Catch this scene in a photo and upload it. Closing this window draws a new scene next time!',
    selectedAlt: 'The photo you selected',
    currentAlt: 'Your current photo',
    chooseAnother: 'Choose another photo',
    chooseNew: 'Choose a new photo',
    choose: 'Take or choose a photo',
    uploading: 'Uploading…',
    upload: 'Upload photo',
    toGallery: "See everyone's photos in the gallery",
  },
  quiz: {
    trigger: (won: boolean, rank: Rank, suit: Suit) => `${won ? 'Quiz won' : 'Quiz'} for the ${cardName(rank, suit)}`,
    title: (name: string) => `Quiz · ${name}`,
    noQuestions: 'There are no questions for this card yet: try again later.',
    loading: 'Picking your question…',
    stale: 'This question had already changed: here is your current one.',
    penalty: (penalties: number) => `Wrong answer: you got a penalty (${penalties} so far). Here is a new question.`,
    lifeLost: (lives: number) => `Wrong answer: you lost a life (${lives} left). Here is a new question.`,
    right: 'Right answer! 🎉',
    collected: (rank: Rank, suit: Suit) => `You collected the ${cardName(rank, suit)}.`,
    number: (number?: number) => `Question n° ${number}`,
    inPerson: (rank: Rank, suit: Suit, number?: number): ReactNode => (
      <>
        The {cardName(rank, suit)} will ask you this question <strong>in person</strong> and read you the possible
        answers: go and find them, tell them it is question n° {number}, then pick the letter of your answer.
      </>
    ),
    hint: 'Not sure? Ask the other guests! A wrong answer costs a life.',
  },
  guess: {
    trigger: (locked: boolean, collected: boolean, rank: Rank) =>
      locked
        ? `Hint of the ${cardName(rank, 'spades')}: locked until you collect the ${cardName(rank - 1, 'spades')}`
        : `${collected ? 'Hints and selfie' : 'Hint'} of the ${cardName(rank, 'spades')}`,
    title: (name: string) => `Guess who · ${name}`,
    loading: 'Reading the hints…',
    locked: (rank: Rank) => `This card is still locked: send the selfie of the ${cardName(rank - 1, 'spades')} first.`,
    hintsTitle: (count: number) => (count === 1 ? 'The hint' : `The ${count} hints so far`),
    newBadge: 'new',
    allYours: 'All the spades are yours! 🎉',
    collected: 'Card collected! 🎉',
    selfieAlt: (rank: Rank) => `Your selfie for the ${cardName(rank, 'spades')}`,
    sameAsBefore: (rank: Rank) => `Same person as before: the selfie of the ${cardName(rank, 'spades')}.`,
    yourSelfie: 'Your selfie for this card.',
    nowGuess: 'Now write who you think it is, under the rules.',
    unlocked: (rank: Rank) => `The ${cardName(rank, 'spades')} is unlocked.`,
    cannotChange: 'A selfie cannot be changed once sent.',
    find: (count: number) =>
      `Find a guest who matches ${count === 1 ? 'this hint' : 'all these hints'} and take a selfie with them.`,
    stillMatches: 'Does the person of your last selfie still match every hint?',
    confirming: 'Confirming…',
    samePerson: 'Same person as before',
    selectedAlt: 'The selfie you selected',
    chooseAnother: 'Choose another selfie',
    takeNew: 'Take a new selfie',
    choose: 'Take or choose a selfie',
    uploading: 'Uploading…',
    upload: 'Upload selfie',
  },
  guessPanel: {
    title: 'Guess who',
    found: (name: string | null): ReactNode => (
      <>
        🎉 You found <strong>{name}</strong>! The spades are complete.
      </>
    ),
    collectAll: 'Collect all 13 spades, then write the name and surname of the person you think it is.',
    openAce: 'Open the Ace to read the first hint about the person you have to find.',
    question: 'All the spades are yours: who is the person behind the hints?',
    name: (count: number) => `Name (${count} letters)`,
    surname: (count: number) => `Surname (${count} letters)`,
    nameBoxes: 'Name',
    surnameBoxes: 'Surname',
    wrong: 'That is not your person: read the hints again and try another name.',
  },
  riddle: {
    documentTitle: 'Riddle',
    loading: 'Unfolding the riddle…',
    eyebrow: 'Riddle',
    oops: 'Oops!',
    toCollection: 'Go to your collection',
    /** "7 of Clubs" (the heading keeps the suit capitalised). */
    heading: (rank: string, suit: string) => `${rank} of ${suit}`,
    solved: (rank: Rank, suit: Suit) => `You collected the ${cardName(rank, suit)}! 🎉`,
    seeSuit: (suit: string) => `See your ${suit.toLowerCase()}`,
    answer: (count: number) => `Your answer (${count} letters)`,
    wrong: 'Not quite! Read the riddle again and try another answer.',
  },
  gallery: {
    documentTitle: 'Gallery',
    eyebrow: 'Photo challenge',
    title: 'Gallery',
    intro: 'The scenes caught by everyone. New photos show up here by themselves.',
    newPhotos: (count: number) => `${count} new photo${count === 1 ? '' : 's'}`,
    loading: 'Developing the photos…',
    empty: 'No photos yet: be the first to catch a scene! 📷',
    list: 'Photos',
    tile: (scene: string, player: string, card: string) => `${scene}, by ${player} (${card})`,
    loadingMore: 'Loading…',
    loadMore: 'Load more photos',
    back: '← Back to the hearts',
    caughtBy: 'Caught by',
  },
};

/** Texts of the card game (suit pages, challenges, riddles, gallery). */
export const gameMessages: Dictionary<typeof en> = {
  en,
  it: {
    tryAgain: 'Riprova',
    submit: 'Invia',
    checking: 'Controllo…',
    backToCards: 'Torna alle carte',
    backToCollectionArrow: '← Torna alla tua collezione',
    backToCollection: 'Torna alla tua collezione',
    earnedStar: 'Hai guadagnato una',
    yourLetter: 'La tua lettera:',

    collection: {
      eyebrow: (symbol) => `${symbol} La tua collezione`,
      introLetters:
        'Tocca una carta per girarla. Ogni carta che raccogli nasconde un segreto sul retro: metti insieme le lettere per scoprire la frase segreta.',
      introStars: 'Tocca una carta per girarla: ogni carta che raccogli mostra una stella sul retro.',
      loading: 'Sto mescolando le tue carte…',
      collected: (count, total) => `${count}/${total} carte raccolte`,
      list: (suit) => `Carte di ${suit.toLowerCase()}`,
    },
    phrase: {
      caption: 'Frase segreta',
      summary: (phrase, found, total) => `${phrase} — ${found} lettere trovate su ${total}`,
      count: (found, total) => `${found}/${total} lettere trovate`,
    },
    flip: {
      collected: ', raccolta',
      notCollected: ', non ancora raccolta',
      showing: (back) => `, mostra ${back}`,
      back: 'il retro',
      backStar: 'il retro con una stella',
      backLetter: (letter) => `il retro con la lettera ${letter}`,
    },
    suitCard: {
      collected: (count, total) => `${count} carte raccolte su ${total}`,
      unavailable: 'avanzamento non disponibile',
      personFound: 'persona trovata',
      personNotFound: 'persona non ancora trovata',
      badgeFound: 'Persona trovata ✓',
      badgeNotFound: 'Persona da trovare',
    },
    rules: { title: 'Regole' },
    letters: {
      box: (label, index, count) => `${label ? `${label}, lettera` : 'Lettera'} ${index} di ${count}`,
    },
    lives: {
      region: 'Le tue vite',
      lives: 'Vite',
      penalties: 'Penitenze',
      summary: (lives, max, penalties) =>
        `${lives} vite rimaste su ${max}${penalties > 0 ? `, ${penalties} ${penalties === 1 ? 'penitenza' : 'penitenze'}` : ''}`,
    },
    photo: {
      trigger: (replacing, rank, suit) =>
        `${replacing ? 'Cambia la foto' : 'Sfida fotografica'} ${replacing ? itOfThe(rank, suit) : `per ${itThe(rank, suit)}`}`,
      title: (name) => `Sfida fotografica · ${name}`,
      drawing: 'Sto estraendo la tua scena…',
      uploaded: 'Foto caricata! 🎉',
      collected: (rank, suit) => `Hai raccolto ${itThe(rank, suit)}. Ora tutti possono vederla nella galleria.`,
      yourScene: 'La tua scena',
      locked: 'Hai già caricato una foto per questa scena: la scena resta la stessa, puoi solo sostituire la foto.',
      unlocked: 'Immortala questa scena in una foto e caricala. Se chiudi questa finestra, la prossima volta uscirà una scena nuova!',
      selectedAlt: 'La foto che hai scelto',
      currentAlt: 'La tua foto attuale',
      chooseAnother: 'Scegli un’altra foto',
      chooseNew: 'Scegli una nuova foto',
      choose: 'Scatta o scegli una foto',
      uploading: 'Caricamento…',
      upload: 'Carica la foto',
      toGallery: 'Guarda le foto di tutti nella galleria',
    },
    quiz: {
      trigger: (won, rank, suit) => `${won ? 'Quiz vinto' : 'Quiz'} ${won ? 'con' : 'per'} ${itThe(rank, suit)}`,
      title: (name) => `Quiz · ${name}`,
      noQuestions: 'Questa carta non ha ancora domande: riprova più tardi.',
      loading: 'Sto scegliendo la tua domanda…',
      stale: 'Questa domanda era già cambiata: ecco quella attuale.',
      penalty: (penalties) =>
        `Risposta sbagliata: hai una penitenza in più (${penalties} finora). Ecco una nuova domanda.`,
      lifeLost: (lives) =>
        `Risposta sbagliata: hai perso una vita (${lives === 1 ? 'ne resta 1' : `ne restano ${lives}`}). Ecco una nuova domanda.`,
      right: 'Risposta esatta! 🎉',
      collected: (rank, suit) => `Hai raccolto ${itThe(rank, suit)}.`,
      number: (number) => `Domanda n° ${number}`,
      inPerson: (rank, suit, number) => (
        <>
          {itArticle(rank).replace(/^./, (first) => first.toUpperCase())}
          {cardName(rank, suit)} ti farà questa domanda <strong>di persona</strong> e ti leggerà le risposte possibili:
          vai a cercarlo, digli che è la domanda n° {number}, poi scegli la lettera della tua risposta.
        </>
      ),
      hint: 'Hai un dubbio? Chiedi agli altri invitati! Una risposta sbagliata costa una vita.',
    },
    guess: {
      trigger: (locked, collected, rank) =>
        locked
          ? `Indizio ${itOfThe(rank, 'spades')}: bloccato finché non raccogli ${itThe(rank - 1, 'spades')}`
          : `${collected ? 'Indizi e selfie' : 'Indizio'} ${itOfThe(rank, 'spades')}`,
      title: (name) => `Indovina chi · ${name}`,
      loading: 'Sto leggendo gli indizi…',
      locked: (rank) => `Questa carta è ancora bloccata: prima invia il selfie ${itOfThe(rank - 1, 'spades')}.`,
      hintsTitle: (count) => (count === 1 ? 'L’indizio' : `I ${count} indizi finora`),
      newBadge: 'nuovo',
      allYours: 'Tutte le picche sono tue! 🎉',
      collected: 'Carta raccolta! 🎉',
      selfieAlt: (rank) => `Il tuo selfie per ${itThe(rank, 'spades')}`,
      sameAsBefore: (rank) => `Stessa persona di prima: il selfie ${itOfThe(rank, 'spades')}.`,
      yourSelfie: 'Il tuo selfie per questa carta.',
      nowGuess: 'Ora scrivi chi pensi che sia, sotto le regole.',
      unlocked: (rank) => {
        const name = itThe(rank, 'spades');
        return `${name.charAt(0).toUpperCase()}${name.slice(1)} è sbloccat${rank === 12 ? 'a' : 'o'}.`;
      },
      cannotChange: 'Una volta inviato, il selfie non si può cambiare.',
      find: (count) =>
        `Trova un invitato che corrisponda a ${count === 1 ? 'questo indizio' : 'tutti questi indizi'} e fatti un selfie con lui o lei.`,
      stillMatches: 'La persona del tuo ultimo selfie corrisponde ancora a tutti gli indizi?',
      confirming: 'Conferma…',
      samePerson: 'Stessa persona di prima',
      selectedAlt: 'Il selfie che hai scelto',
      chooseAnother: 'Scegli un altro selfie',
      takeNew: 'Fai un nuovo selfie',
      choose: 'Scatta o scegli un selfie',
      uploading: 'Caricamento…',
      upload: 'Carica il selfie',
    },
    guessPanel: {
      title: 'Indovina chi',
      found: (name) => (
        <>
          🎉 Hai trovato <strong>{name}</strong>! Le picche sono complete.
        </>
      ),
      collectAll: 'Raccogli tutte le 13 picche, poi scrivi nome e cognome della persona che pensi sia.',
      openAce: 'Apri l’Asso per leggere il primo indizio sulla persona che devi trovare.',
      question: 'Tutte le picche sono tue: chi è la persona dietro gli indizi?',
      name: (count) => `Nome (${count} lettere)`,
      surname: (count) => `Cognome (${count} lettere)`,
      nameBoxes: 'Nome',
      surnameBoxes: 'Cognome',
      wrong: 'Non è la tua persona: rileggi gli indizi e prova un altro nome.',
    },
    riddle: {
      documentTitle: 'Indovinello',
      loading: 'Sto aprendo l’indovinello…',
      eyebrow: 'Indovinello',
      oops: 'Ops!',
      toCollection: 'Vai alla tua collezione',
      heading: (rank, suit) => `${rank} di ${suit}`,
      solved: (rank, suit) => `Hai raccolto ${itThe(rank, suit)}! 🎉`,
      seeSuit: (suit) => `Guarda i tuoi ${suit.toLowerCase()}`,
      answer: (count) => `La tua risposta (${count} lettere)`,
      wrong: 'Non proprio! Rileggi l’indovinello e prova un’altra risposta.',
    },
    gallery: {
      documentTitle: 'Galleria',
      eyebrow: 'Sfida fotografica',
      title: 'Galleria',
      intro: 'Le scene immortalate da tutti. Le nuove foto compaiono qui da sole.',
      newPhotos: (count) => (count === 1 ? '1 nuova foto' : `${count} nuove foto`),
      loading: 'Sto sviluppando le foto…',
      empty: 'Ancora nessuna foto: sii il primo a immortalare una scena! 📷',
      list: 'Foto',
      tile: (scene, player, card) => `${scene}, di ${player} (${card})`,
      loadingMore: 'Caricamento…',
      loadMore: 'Carica altre foto',
      back: '← Torna ai cuori',
      caughtBy: 'Scattata da',
    },
  },
};
