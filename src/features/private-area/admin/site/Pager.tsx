import formStyles from '../../../../components/Form/Form.module.css';
import { useMessages } from '../../../../i18n';
import type { AdminPage } from '../../../../services/admin';
import { siteSettingsMessages } from '../../messages/siteSettings';
import styles from './site.module.css';

/** ← Previous · Page 2 of 4 · Next →, only when there is more than one page. */
export function Pager({
  data,
  busy,
  onPage,
}: {
  data: AdminPage<unknown>;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  const t = useMessages(siteSettingsMessages).paging;
  if (data.totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label={t.pages}>
      <button
        type="button"
        className={formStyles.textButton}
        disabled={busy || data.page <= 1}
        onClick={() => onPage(data.page - 1)}
      >
        {t.previous}
      </button>
      <span>{t.pageOf(data.page, data.totalPages)}</span>
      <button
        type="button"
        className={formStyles.textButton}
        disabled={busy || data.page >= data.totalPages}
        onClick={() => onPage(data.page + 1)}
      >
        {t.next}
      </button>
    </nav>
  );
}
