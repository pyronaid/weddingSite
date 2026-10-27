import { useCallback, useId, useState } from 'react';
import formStyles from '../../../../components/Form/Form.module.css';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { LOCALES, useLanguage, useMessages } from '../../../../i18n';
import type { AdminRsvp, RsvpFilter, RsvpSummary } from '../../../../services/admin';
import { useSiteContent } from '../../../../site/SiteContentContext';
import { siteSettingsMessages } from '../../messages/siteSettings';
import { useAdminRepository } from '../AdminRepositoryContext';
import { Pager } from './Pager';
import styles from './site.module.css';
import { usePagedList } from './usePagedList';
import { SEARCH_DEBOUNCE_MS } from './UsersEditor';

const FILTERS: RsvpFilter[] = ['all', 'yes', 'no'];

/**
 * Super admins: the replies to the invitation, 20 at a time, newest first,
 * filtered by name or e-mail and by answer, with the headcount on top.
 * Read only: the guests' replies are not edited from here.
 */
export function RsvpsList() {
  const t = useMessages(siteSettingsMessages).rsvps;
  const repository = useAdminRepository();
  const id = useId();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RsvpFilter>('all');
  const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  // A new search or filter starts from its first page (usePagedList).
  const load = useCallback((page: number) => repository.listRsvps(search, filter, page), [repository, search, filter]);
  const { data, busy, error, top, goTo, retry } = usePagedList(load);
  const filtered = search !== '' || filter !== 'all';

  return (
    <section ref={top} className={styles.section} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.sectionTitle}>
        {t.title}
      </h3>
      <p className={formStyles.hint}>{t.hint}</p>

      {data && <Summary summary={data.summary} />}

      <div className={styles.rsvpFilters}>
        <div className={formStyles.field}>
          <label htmlFor={`${id}-search`}>{t.search}</label>
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor={`${id}-filter`}>{t.filter}</label>
          <select id={`${id}-filter`} value={filter} onChange={(event) => setFilter(event.target.value as RsvpFilter)}>
            {FILTERS.map((value) => (
              <option key={value} value={value}>
                {t.filters[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={styles.muted} role="status" aria-live="polite">
        {busy
          ? t.searching
          : error || !data
            ? ''
            : data.totalItems === 0
              ? filtered
                ? t.none
                : t.noneAtAll
              : t.count(data.totalItems)}
      </p>

      {error && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {error}{' '}
          <button type="button" className={formStyles.textButton} onClick={retry}>
            ↻
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <ul className={styles.userList} aria-busy={busy}>
          {data.items.map((rsvp) => (
            <RsvpRow key={rsvp.id} rsvp={rsvp} />
          ))}
        </ul>
      )}

      {data && <Pager data={data} busy={busy} onPage={goTo} />}
    </section>
  );
}

/** Who is coming, from the latest reply of each guest: whatever the filter. */
function Summary({ summary }: { summary: RsvpSummary }) {
  const t = useMessages(siteSettingsMessages).rsvps;
  return (
    <dl className={styles.summary} aria-label={t.summary}>
      <div className={styles.summaryTile}>
        <dt>{t.coming}</dt>
        <dd>
          <strong>{t.people(summary.guests)}</strong>
          <span className={styles.muted}>{t.replies(summary.attending)}</span>
        </dd>
      </div>
      <div className={styles.summaryTile}>
        <dt>{t.notComing}</dt>
        <dd>
          <strong>{t.replies(summary.declined)}</strong>
        </dd>
      </div>
      <div className={styles.summaryTile}>
        <dt>{t.total}</dt>
        <dd>
          <strong>{summary.replies}</strong>
        </dd>
      </div>
    </dl>
  );
}

function RsvpRow({ rsvp }: { rsvp: AdminRsvp }) {
  const t = useMessages(siteSettingsMessages).rsvps;
  const language = useLanguage();
  const { content } = useSiteContent();
  // In the wedding's time zone, like every date of the site.
  const sent = new Intl.DateTimeFormat(LOCALES[language], {
    timeZone: content.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(rsvp.created));

  return (
    <li className={`${styles.userRow} ${rsvp.replaced ? styles.replaced : ''}`}>
      <div className={styles.rsvpHead}>
        <div className={styles.userName}>
          <strong>{rsvp.fullName}</strong>
          <a href={`mailto:${rsvp.email}`} className={styles.muted}>
            {rsvp.email}
          </a>
        </div>
        <span className={`${styles.badge} ${rsvp.attending ? styles.badgeYes : styles.badgeNo}`}>
          {rsvp.attending ? t.attending(rsvp.guests) : t.declined}
        </span>
      </div>
      {rsvp.replaced && <p className={styles.muted}>{t.replaced}</p>}
      {(rsvp.dietaryNotes || rsvp.message) && (
        <dl className={styles.rsvpDetails}>
          {rsvp.dietaryNotes && (
            <div>
              <dt>{t.dietary}</dt>
              <dd>{rsvp.dietaryNotes}</dd>
            </div>
          )}
          {rsvp.message && (
            <div>
              <dt>{t.message}</dt>
              <dd>{rsvp.message}</dd>
            </div>
          )}
        </dl>
      )}
      <p className={styles.muted}>
        <time dateTime={rsvp.created}>{t.sent(sent)}</time>
      </p>
    </li>
  );
}
