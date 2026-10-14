import { getPocketBase } from '../../lib/pocketbase';
import { ConsoleRsvpRepository } from './consoleRsvpRepository';
import { PocketBaseRsvpRepository } from './pocketbaseRsvpRepository';
import type { RsvpRepository } from './types';

export * from './types';
export * from './validation';

export function createRsvpRepository(): RsvpRepository {
  const pb = getPocketBase();
  return pb ? new PocketBaseRsvpRepository(pb) : new ConsoleRsvpRepository();
}
