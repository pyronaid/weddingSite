import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../../components/Form/Form.module.css';
import { CardHeader } from '../../../../components/InfoCard/CardHeader';
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle';
import { useMessages } from '../../../../i18n';
import { toAdminError } from '../../../../services/admin';
import type { SiteContent, SiteSettings } from '../../../../services/site';
import { useSiteContent } from '../../../../site/SiteContentContext';
import { AREA_HOME } from '../../guards';
import { siteSettingsMessages } from '../../messages/siteSettings';
import { useAuth } from '../../useAuth';
import { PhotosEditor } from './PhotosEditor';
import { SiteSettingsForm } from './SiteSettingsForm';
import styles from './site.module.css';

type State = { status: 'loading' } | { status: 'ready'; content: SiteContent } | { status: 'error'; message: string };

/**
 * Super admin only: the content of the public site. Edits the latest content
 * from the server (not the copy cached in the browser); every save updates
 * the whole site at once (a new language re-renders everything in it).
 */
export function SiteSettingsPage() {
  const t = useMessages(siteSettingsMessages);
  useDocumentTitle(t.documentTitle);
  const { repository, replace } = useSiteContent();
  const { auth } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    repository.load().then(
      (content) => active && setState({ status: 'ready', content }),
      (reason: unknown) => {
        if (!active) return;
        const error = toAdminError(reason);
        if (error.code === 'unauthenticated') auth.logout();
        setState({ status: 'error', message: error.message });
      },
    );
    return () => {
      active = false;
    };
  }, [repository, auth, attempt]);

  const update = useCallback(
    (content: SiteContent) => {
      setState({ status: 'ready', content });
      replace(content);
    },
    [replace],
  );

  const save = async (settings: SiteSettings) => {
    const saved = await repository.save(settings);
    update(saved);
    return saved;
  };

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="site-settings-title" eyebrow={t.eyebrow} title={t.title} />
      <p className={styles.intro}>{t.intro}</p>

      {state.status === 'loading' && <p className={styles.intro} role="status">…</p>}
      {state.status === 'error' && (
        <div role="alert" className={`${formStyles.notice} ${formStyles.noticeError}`}>
          {t.loadingFailed} {state.message}{' '}
          <button
            type="button"
            className={formStyles.textButton}
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            ↻
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <SiteSettingsForm content={state.content} onSave={save} />
          <PhotosEditor content={state.content} repository={repository} onChange={update} />
        </>
      )}

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        {t.back}
      </Link>
    </div>
  );
}
