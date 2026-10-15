import type PocketBase from 'pocketbase';
import { gameError, toGameError } from './errors';
import {
  isSuit,
  SUITS,
  type FileToken,
  type GalleryPage,
  type GalleryPhoto,
  type GameProgress,
  type GameRepository,
  type PhotoDraw,
  type PlayingCard,
  type Riddle,
  type RiddleAttempt,
  type Suit,
} from './types';

const CARDS = 'cards';
const COLLECTED = 'collected_cards';
const SUBMISSIONS = 'photo_submissions';

// Thumbnail sizes declared on the photo field (see the photo challenge migration).
const THUMB_GRID = '480x0';
const THUMB_LARGE = '1200x0';
/** Renew file tokens this long before they expire. */
const TOKEN_RENEW_MARGIN_MS = 5 * 60 * 1000;
const GALLERY_FIELDS =
  'id,collectionId,collectionName,photo,scene_text,player,updated,expand.card.suit,expand.card.rank';

interface CardRow {
  suit: string;
}

interface CardRecord {
  id: string;
  rank: number;
  letter?: string;
}

/** Payloads of the custom endpoints in pb_hooks/riddles.pb.js. */
interface RiddleResponse {
  suit: Suit;
  rank: number;
  riddle: string;
  length: number;
  collected: boolean;
  letter: string;
}

interface SolveResponse {
  correct: boolean;
  collected: boolean;
  letter: string;
}

interface DrawResponse {
  submissionId: string;
  collectionId: string;
  scene: string;
  locked: boolean;
  photo: string;
}

interface SubmissionRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  photo: string;
  scene_text: string;
  player: string;
  updated: string;
  expand?: { card?: { suit: Suit; rank: number } };
}

const riddlePath = (code: string) => `/api/game/riddles/${encodeURIComponent(code)}`;

interface CollectedRow {
  expand?: { card?: CardRow };
}

function countBySuit(suits: Iterable<string>): Record<Suit, number> {
  const counts = Object.fromEntries(SUITS.map((suit) => [suit, 0])) as Record<Suit, number>;
  for (const suit of suits) {
    // Ignore values unknown to this build (e.g. a suit added on the server first).
    if (isSuit(suit)) counts[suit] += 1;
  }
  return counts;
}

/** Expiry (ms) read from the token itself, so the server's setting is the only source of truth. */
function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {
    // Not a readable JWT: fall through.
  }
  return Date.now() + 2 * 60 * 1000;
}

export class PocketBaseGameRepository implements GameRepository {
  private readonly pb: PocketBase;
  private fileToken: (FileToken & { userId: string }) | null = null;

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  async getProgress(): Promise<GameProgress> {
    const userId = this.requireUserId();

    try {
      // Totals come from the deck too, so changing it never needs a frontend
      // release. `fields` keeps both payloads to the bare minimum.
      const [deck, collected] = await Promise.all([
        this.pb.collection(CARDS).getFullList<CardRow>({ fields: 'suit' }),
        this.pb.collection(COLLECTED).getFullList<CollectedRow>({
          // The list rule already limits rows to the current user; the explicit
          // filter documents the intent and keeps it right for superusers too.
          filter: this.pb.filter('user = {:userId}', { userId }),
          expand: 'card',
          fields: 'expand.card.suit',
        }),
      ]);

      const totals = countBySuit(deck.map((card) => card.suit));
      const owned = countBySuit(collected.flatMap((row) => row.expand?.card?.suit ?? []));

      return Object.fromEntries(
        SUITS.map((suit) => [suit, { collected: owned[suit], total: totals[suit] }]),
      ) as GameProgress;
    } catch (error) {
      throw toGameError(error);
    }
  }

  async getSuitCards(suit: Suit): Promise<PlayingCard[]> {
    const userId = this.requireUserId();

    try {
      const [cards, collected] = await Promise.all([
        // `letter` is a hidden field: the server includes it only on the
        // cards this user collected (see pb_hooks/cards.pb.js).
        this.pb.collection(CARDS).getFullList<CardRecord>({
          filter: this.pb.filter('suit = {:suit}', { suit }),
          sort: 'rank',
          fields: 'id,rank,letter',
        }),
        this.pb.collection(COLLECTED).getFullList<{ card: string }>({
          filter: this.pb.filter('user = {:userId} && card.suit = {:suit}', { userId, suit }),
          fields: 'card',
        }),
      ]);

      const owned = new Set(collected.map((row) => row.card));
      return cards.map((card) => {
        const isCollected = owned.has(card.id);
        return {
          id: card.id,
          suit,
          rank: card.rank,
          collected: isCollected,
          letter: isCollected && card.letter ? card.letter : null,
        };
      });
    } catch (error) {
      throw toGameError(error);
    }
  }

  async getRiddle(code: string): Promise<Riddle> {
    this.requireUserId();
    try {
      const data = await this.pb.send<RiddleResponse>(riddlePath(code), { method: 'GET' });
      return {
        suit: data.suit,
        rank: data.rank,
        text: data.riddle,
        length: data.length,
        collected: data.collected,
        letter: data.letter || null,
      };
    } catch (error) {
      throw toGameError(error);
    }
  }

  async solveRiddle(code: string, answer: string): Promise<RiddleAttempt> {
    this.requireUserId();
    try {
      const data = await this.pb.send<SolveResponse>(`${riddlePath(code)}/solve`, {
        method: 'POST',
        body: { answer },
      });
      return { correct: data.correct, collected: data.collected, letter: data.letter || null };
    } catch (error) {
      throw toGameError(error);
    }
  }

  async drawPhotoScene(cardId: string): Promise<PhotoDraw> {
    this.requireUserId();
    try {
      const data = await this.pb.send<DrawResponse>(`/api/game/photos/${encodeURIComponent(cardId)}/draw`, {
        method: 'POST',
      });
      const record = { id: data.submissionId, collectionId: data.collectionId, collectionName: SUBMISSIONS };
      const token = data.photo ? (await this.getFileToken()).token : '';
      return {
        submissionId: data.submissionId,
        scene: data.scene,
        locked: data.locked,
        photoUrl: data.photo ? this.pb.files.getURL(record, data.photo, { thumb: THUMB_GRID, token }) : null,
      };
    } catch (error) {
      throw toGameError(error);
    }
  }

  async uploadPhoto(submissionId: string, photo: Blob): Promise<void> {
    this.requireUserId();
    const body = new FormData();
    body.append('photo', photo, 'photo.jpg');
    try {
      await this.pb.collection(SUBMISSIONS).update(submissionId, body, { fields: 'id' });
    } catch (error) {
      // 400: rejected file (type/size), 413: body too large for the server.
      const status = (error as { status?: number }).status;
      throw status === 400 || status === 413 ? gameError('invalid_photo', error) : toGameError(error);
    }
  }

  async getGallery(page: number, perPage: number): Promise<GalleryPage> {
    this.requireUserId();
    try {
      const result = await this.pb.collection(SUBMISSIONS).getList<SubmissionRecord>(page, perPage, {
        sort: '-updated,-id',
        expand: 'card',
        fields: GALLERY_FIELDS,
        // The total count costs an extra COUNT query: "is there a next page" is enough.
        skipTotal: true,
      });
      return { items: result.items.map(this.toGalleryPhoto), hasMore: result.items.length === perPage };
    } catch (error) {
      throw toGameError(error);
    }
  }

  async getGalleryUpdates(since: string): Promise<GalleryPhoto[]> {
    this.requireUserId();
    try {
      const result = await this.pb.collection(SUBMISSIONS).getList<SubmissionRecord>(1, 100, {
        filter: this.pb.filter('updated > {:since}', { since }),
        sort: '-updated,-id',
        expand: 'card',
        fields: GALLERY_FIELDS,
        skipTotal: true,
      });
      return result.items.map(this.toGalleryPhoto);
    } catch (error) {
      throw toGameError(error);
    }
  }

  async getFileToken({ force = false }: { force?: boolean } = {}): Promise<FileToken> {
    const userId = this.requireUserId();
    const cached = this.fileToken;
    if (!force && cached && cached.userId === userId && cached.expiresAt - Date.now() > TOKEN_RENEW_MARGIN_MS) {
      return { token: cached.token, expiresAt: cached.expiresAt };
    }
    try {
      const token = await this.pb.files.getToken();
      this.fileToken = { token, expiresAt: tokenExpiry(token), userId };
      return { token, expiresAt: this.fileToken.expiresAt };
    } catch (error) {
      throw toGameError(error);
    }
  }

  private toGalleryPhoto = (record: SubmissionRecord): GalleryPhoto => ({
    id: record.id,
    suit: record.expand?.card?.suit ?? 'hearts',
    rank: record.expand?.card?.rank ?? 0,
    scene: record.scene_text,
    player: record.player,
    thumbUrl: this.pb.files.getURL(record, record.photo, { thumb: THUMB_GRID }),
    largeUrl: this.pb.files.getURL(record, record.photo, { thumb: THUMB_LARGE }),
    updated: record.updated,
  });

  private requireUserId(): string {
    const userId = this.pb.authStore.isValid ? this.pb.authStore.record?.id : undefined;
    if (!userId) throw gameError('unauthenticated');
    return userId;
  }
}
