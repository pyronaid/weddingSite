import { getPocketBase } from '../../lib/pocketbase';
import { adminError } from './errors';
import { PocketBaseAdminRepository } from './pocketbaseAdminRepository';
import type { AdminRepository } from './types';

export * from './types';
export { toAdminError } from './errors';

export function createAdminRepository(): AdminRepository {
  const pb = getPocketBase();
  if (pb) return new PocketBaseAdminRepository(pb);
  const fail = () => Promise.reject(adminError('not_configured'));
  return {
    getSuit: fail,
    updateCard: fail,
    addScene: fail,
    updateScene: fail,
    deleteScene: fail,
    addQuestion: fail,
    updateQuestion: fail,
    deleteQuestion: fail,
    addAnswer: fail,
    updateAnswer: fail,
    deleteAnswer: fail,
    getPeople: fail,
    addPerson: fail,
    updatePerson: fail,
    deletePerson: fail,
    listUsers: fail,
    setUserSuits: fail,
    listRsvps: fail,
    getSettings: fail,
    updateSettings: fail,
  };
}
