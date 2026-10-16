import type PocketBase from 'pocketbase';
import type { Suit } from '../game';
import { toAdminError } from './errors';
import type { AdminCard, AdminCardChanges, AdminRepository, AdminScene, AdminSettings } from './types';

/** Client of the endpoints in pb_hooks/admin.pb.js. */
export class PocketBaseAdminRepository implements AdminRepository {
  private readonly pb: PocketBase;

  constructor(pb: PocketBase) {
    this.pb = pb;
  }

  private async call<T>(path: string, method: string, body?: object): Promise<T> {
    try {
      return await this.pb.send<T>(`/api/admin${path}`, { method, body });
    } catch (error) {
      throw toAdminError(error);
    }
  }

  async getSuit(suit: Suit): Promise<AdminCard[]> {
    const { cards } = await this.call<{ cards: AdminCard[] }>(`/suits/${encodeURIComponent(suit)}`, 'GET');
    return cards;
  }

  updateCard(cardId: string, changes: AdminCardChanges): Promise<AdminCard> {
    return this.call(`/cards/${encodeURIComponent(cardId)}`, 'PATCH', changes);
  }

  addScene(cardId: string, text: string): Promise<AdminScene> {
    return this.call(`/cards/${encodeURIComponent(cardId)}/scenes`, 'POST', { text });
  }

  updateScene(sceneId: string, text: string): Promise<AdminScene> {
    return this.call(`/scenes/${encodeURIComponent(sceneId)}`, 'PATCH', { text });
  }

  async deleteScene(sceneId: string): Promise<void> {
    await this.call(`/scenes/${encodeURIComponent(sceneId)}`, 'DELETE');
  }

  getSettings(): Promise<AdminSettings> {
    return this.call('/settings', 'GET');
  }

  updateSettings(settings: AdminSettings): Promise<AdminSettings> {
    return this.call('/settings', 'PATCH', settings);
  }
}
