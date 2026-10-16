import { createContext, useContext } from 'react';
import { createAdminRepository, type AdminRepository } from '../../../services/admin';

const AdminRepositoryContext = createContext<AdminRepository | null>(null);

/** Lets tests inject a repository; production uses the default one. */
export const AdminRepositoryProvider = AdminRepositoryContext.Provider;

let defaultRepository: AdminRepository | undefined;

export function useAdminRepository(): AdminRepository {
  return useContext(AdminRepositoryContext) ?? (defaultRepository ??= createAdminRepository());
}
