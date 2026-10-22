import type PocketBase from 'pocketbase';
import { defaultContent, defaultPhoto } from '../../config/wedding';
import { isLanguage } from '../../i18n';
// Errors of the organisers' screens (field messages included): the super admin page uses them too.
import { toAdminError } from '../admin/errors';
import { isPhotoSlot, PHOTO_SLOTS } from './slots';
import type { Photo, PhotoSlot, SiteContent, SiteRepository, SiteSettings } from './types';

const CONTENT = 'site_content';
const PHOTOS = 'site_photos';
// Thumbnails declared on the image field (see the site content migration).
const THUMB_HERO = '1600x0';
const THUMB_SECTION = '800x0';

/** The site_content record, as stored. */
interface ContentRecord {
  id: string;
  language: string;
  partner_one: string;
  partner_two: string;
  hashtag: string;
  tagline: string;
  date: string;
  timezone: string;
  rsvp_deadline: string;
  ceremony_name: string;
  ceremony_address: string;
  ceremony_time: string;
  ceremony_map: string;
  reception_name: string;
  reception_address: string;
  reception_time: string;
  reception_map: string;
  gift_message: string;
  account_holder: string;
  iban: string;
  bic: string;
  bank_name: string;
  payment_reason: string;
}

interface PhotoRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  slot: string;
  image: string;
  alt: string;
}

function toSettings(record: ContentRecord): SiteSettings {
  return {
    language: isLanguage(record.language) ? record.language : defaultContent.language,
    couple: { partnerOne: record.partner_one, partnerTwo: record.partner_two, hashtag: record.hashtag },
    tagline: record.tagline,
    date: record.date,
    timezone: record.timezone,
    rsvpDeadline: record.rsvp_deadline,
    ceremony: {
      name: record.ceremony_name,
      address: record.ceremony_address,
      time: record.ceremony_time,
      mapQuery: record.ceremony_map || record.ceremony_address,
    },
    reception: record.reception_name
      ? {
          name: record.reception_name,
          address: record.reception_address,
          time: record.reception_time,
          mapQuery: record.reception_map || record.reception_address,
        }
      : null,
    gift: {
      message: record.gift_message,
      accountHolder: record.account_holder,
      iban: record.iban,
      bic: record.bic,
      bankName: record.bank_name,
      paymentReason: record.payment_reason,
    },
  };
}

function toRecord(settings: SiteSettings): Omit<ContentRecord, 'id'> {
  const { couple, ceremony, reception, gift } = settings;
  return {
    language: settings.language,
    partner_one: couple.partnerOne,
    partner_two: couple.partnerTwo,
    hashtag: couple.hashtag,
    tagline: settings.tagline,
    date: settings.date,
    timezone: settings.timezone,
    rsvp_deadline: settings.rsvpDeadline,
    ceremony_name: ceremony.name,
    ceremony_address: ceremony.address,
    ceremony_time: ceremony.time,
    // The address is the map query by default: store only a different one.
    ceremony_map: ceremony.mapQuery === ceremony.address ? '' : ceremony.mapQuery,
    reception_name: reception?.name ?? '',
    reception_address: reception?.address ?? '',
    reception_time: reception?.time ?? '',
    reception_map: !reception || reception.mapQuery === reception.address ? '' : reception.mapQuery,
    gift_message: gift.message,
    account_holder: gift.accountHolder,
    iban: gift.iban,
    bic: gift.bic,
    bank_name: gift.bankName,
    payment_reason: gift.paymentReason,
  };
}

/**
 * Reads the content for everybody (public collections) and writes it for the
 * super admin (the collection rules check is_superadmin on the server).
 */
export class PocketBaseSiteRepository implements SiteRepository {
  private readonly pb: PocketBase;
  private contentId: string | null = null;
  private photoIds = new Map<PhotoSlot, string>();

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  async load(): Promise<SiteContent> {
    try {
      const [records, photos] = await Promise.all([
        this.pb.collection(CONTENT).getList<ContentRecord>(1, 1, { skipTotal: true, requestKey: null }),
        this.pb.collection(PHOTOS).getFullList<PhotoRecord>({ requestKey: null }),
      ]);
      const record = records.items[0];
      if (!record) return defaultContent;
      this.contentId = record.id;
      return { ...toSettings(record), ...this.toPhotos(photos) };
    } catch (error) {
      throw toAdminError(error);
    }
  }

  async save(settings: SiteSettings): Promise<SiteContent> {
    if (!this.contentId) await this.load();
    try {
      await this.pb.collection(CONTENT).update(this.contentId ?? '', toRecord(settings));
    } catch (error) {
      throw toAdminError(error);
    }
    return this.load();
  }

  async uploadPhoto(slot: PhotoSlot, image: Blob, alt: string): Promise<SiteContent> {
    const body = new FormData();
    body.append('slot', slot);
    body.append('alt', alt);
    body.append('image', image, 'photo.jpg');
    const id = this.photoIds.get(slot);
    try {
      if (id) await this.pb.collection(PHOTOS).update(id, body);
      else await this.pb.collection(PHOTOS).create(body);
    } catch (error) {
      throw toAdminError(error);
    }
    return this.load();
  }

  async updatePhotoAlt(slot: PhotoSlot, alt: string): Promise<SiteContent> {
    const id = this.photoIds.get(slot);
    try {
      // A default picture has no record: its description lives in the code.
      if (id) await this.pb.collection(PHOTOS).update(id, { alt });
    } catch (error) {
      throw toAdminError(error);
    }
    return this.load();
  }

  async resetPhoto(slot: PhotoSlot): Promise<SiteContent> {
    const id = this.photoIds.get(slot);
    try {
      if (id) await this.pb.collection(PHOTOS).delete(id);
    } catch (error) {
      throw toAdminError(error);
    }
    return this.load();
  }

  /** Uploaded photos where there is one, the default picture elsewhere. */
  private toPhotos(records: PhotoRecord[]): Pick<SiteContent, 'photos' | 'uploaded'> {
    this.photoIds.clear();
    const photos = Object.fromEntries(PHOTO_SLOTS.map((slot) => [slot, defaultPhoto(slot)])) as Record<PhotoSlot, Photo>;
    const uploaded: PhotoSlot[] = [];
    for (const record of records) {
      if (!isPhotoSlot(record.slot) || !record.image) continue;
      this.photoIds.set(record.slot, record.id);
      uploaded.push(record.slot);
      photos[record.slot] = {
        src: this.pb.files.getURL(record, record.image, { thumb: record.slot === 'hero' ? THUMB_HERO : THUMB_SECTION }),
        alt: record.alt,
      };
    }
    return { photos, uploaded };
  }
}
