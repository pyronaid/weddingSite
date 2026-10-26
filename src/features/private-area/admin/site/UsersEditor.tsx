import { useEffect, useId, useRef, useState } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useMessages } from '../../../../i18n';
import { toAdminError, type AdminUser, type AdminUsersPage } from '../../../../services/admin';
import { SUITS, type Suit } from '../../../../services/game';
import { SUIT_META } from '../../game/suits';
import { siteSettingsMessages } from '../../messages/siteSettings';
import { useAuth } from '../../useAuth';
import { useAdminRepository } from '../AdminRepositoryContext';
import styles from './site.module.css';

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

/** The answer to one request; `data` stays the last good page, even after an error. */
interface ListState {
  key: string;
  data: AdminUsersPage | null;
  error: string | null;
}

/**
 * Super admins: the registered guests, 20 at a time, filtered by name or
 * e-mail, with the suits each one organises. A toggle saves at once.
 */
export function UsersEditor() {
  const t = useMessages(siteSettingsMessages).users;
  const repository = useAdminRepository();
  const { auth } = useAuth();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListState | null>(null);
  const top = useRef<HTMLElement>(null);
  const goTo = (next: number) => {
    setPage(next);
    // The pager is at the bottom: start reading the new page from its top.
    top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };
  const [attempt, setAttempt] = useState(0);
  // What is asked now; until its answer arrives, the list is loading.
  const key = `${page}|${attempt}|${search}`;

  useEffect(() => {
    // Only the answer to the latest request is kept (typing fast, paging fast).
    let current = true;
    repository.listUsers(search, page).then(
      (data) => current && setState({ key, data, error: null }),
      (reason: unknown) => {
        if (!current) return;
        const error = toAdminError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setState((previous) => ({
          key,
          data: previous?.data ?? null,
          error: error.message,
        }));
      },
    );
    return () => {
      current = false;
    };
  }, [repository, auth, search, page, key]);

  const busy = state?.key !== key;
  // While the next page loads, the current one stays visible (no flicker).
  const data = state?.data ?? null;
  const error = busy ? null : (state?.error ?? null);

  const replace = (user: AdminUser) =>
    setState((current) =>
      current?.data
        ? {
            ...current,
            data: {
              ...current.data,
              items: current.data.items.map((item) => (item.id === user.id ? user : item)),
            },
          }
        : current,
    );

  return (
    <section ref={top} className={styles.section} aria-labelledby={`${searchId}-title`}>
      <h3 id={`${searchId}-title`} className={styles.sectionTitle}>
        {t.title}
      </h3>
      <p className={formStyles.hint}>{t.hint}</p>

      <div className={formStyles.field}>
        <label htmlFor={searchId}>{t.search}</label>
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            // A new search starts from its first page.
            setPage(1);
          }}
        />
      </div>

      <p className={styles.muted} role="status" aria-live="polite">
        {busy
          ? t.searching
          : error
            ? ''
            : data
              ? data.totalItems === 0
                ? search
                  ? t.none(search)
                  : t.noneAtAll
                : t.count(data.totalItems)
              : ''}
      </p>

      {error && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {error}{' '}
          <button type="button" className={formStyles.textButton} onClick={() => setAttempt((n) => n + 1)}>
            ↻
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <ul className={styles.userList} aria-busy={busy}>
          {data.items.map((user) => (
            <UserRow key={user.id} user={user} onSaved={replace} />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav className={styles.pagination} aria-label={t.pages}>
          <button
            type="button"
            className={formStyles.textButton}
            disabled={busy || data.page <= 1}
            onClick={() => goTo(data.page - 1)}
          >
            {t.previous}
          </button>
          <span>{t.pageOf(data.page, data.totalPages)}</span>
          <button
            type="button"
            className={formStyles.textButton}
            disabled={busy || data.page >= data.totalPages}
            onClick={() => goTo(data.page + 1)}
          >
            {t.next}
          </button>
        </nav>
      )}
    </section>
  );
}

/** One guest: name, e-mail and a toggle per suit, each saved on its own. */
function UserRow({ user, onSaved }: { user: AdminUser; onSaved: (user: AdminUser) => void }) {
  const t = useMessages(siteSettingsMessages).users;
  const repository = useAdminRepository();
  // Shown at once; put back if the server refuses.
  const [suits, setSuits] = useState<Suit[]>(user.adminSuits);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (suit: Suit, on: boolean) => {
    const before = suits;
    const next = SUITS.filter((item) => (item === suit ? on : suits.includes(item)));
    setSuits(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await repository.setUserSuits(user.id, next);
      setSuits(saved.adminSuits);
      onSaved(saved);
    } catch (reason) {
      setSuits(before);
      setError(toAdminError(reason).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={styles.userRow}>
      <div className={styles.userName}>
        <strong>{user.name || '—'}</strong>
        <span className={styles.muted}>
          {user.email}
          {!user.verified && ` · ${t.notConfirmed}`}
        </span>
      </div>
      {user.isSuperAdmin ? (
        <p className={styles.muted}>{t.superAdmin}</p>
      ) : (
        <div className={styles.suitToggles} aria-busy={saving}>
          {SUITS.map((suit) => (
            <label key={suit} className={`${styles.suitToggle} ${suits.includes(suit) ? styles.suitOn : ''}`}>
              <input
                type="checkbox"
                checked={suits.includes(suit)}
                disabled={saving}
                aria-label={t.toggle(SUIT_META[suit].label, user.name || user.email)}
                onChange={(event) => void toggle(suit, event.target.checked)}
              />
              <span aria-hidden="true">
                {SUIT_META[suit].symbol} {SUIT_META[suit].label}
              </span>
            </label>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </li>
  );
}
