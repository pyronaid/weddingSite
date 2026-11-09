import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import formStyles from '../../../../components/Form/Form.module.css';
import { CardHeader } from '../../../../components/InfoCard/CardHeader';
import { RouteTabPanel, RouteTabs } from '../../../../components/RouteTabs/RouteTabs';
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle';
import { useMessages } from '../../../../i18n';
import { toAdminError } from '../../../../services/admin';
import type { SiteContent, SiteSettings } from '../../../../services/site';
import { useSiteContent } from '../../../../site/SiteContentContext';
import { isSettingsTab, SETTINGS_TABS, siteSettingsPath, type SettingsTab } from '../../game/suits';
import { AREA_HOME } from '../../guards';
import { siteSettingsMessages } from '../../messages/siteSettings';
import { useAuth } from '../../useAuth';
import { SignupCodeForm } from '../SignupCodeForm';
import { PhotosEditor } from './PhotosEditor';
import { RsvpsList } from './RsvpsList';
import { SiteSettingsForm } from './SiteSettingsForm';
import { UsersEditor } from './UsersEditor';
import styles from './site.module.css';

type State = { status: 'loading' } | { status: 'ready'; content: SiteContent } | { status: 'error'; message: string };

/**
 * Super admin only, in tabs: the content of the public site (general data,
 * photos), who organises which suit, the RSVPs and the sign-up code.
 * The General and Photos tabs edit the latest content from the server (not
 * the copy cached in the browser); every save updates the whole site at once
 * (a new language re-renders everything in it).
 */
export function SiteSettingsPage() {
  const t = useMessages(siteSettingsMessages);
  // /area/site/<tab>; an unknown or missing tab shows the first one.
  const param = useParams().tab;
  const tab: SettingsTab = isSettingsTab(param) ? param : 'general';
  const tabLabels: Record<SettingsTab, string> = {
    general: t.tabs.general,
    photos: t.tabs.photos,
    organisers: t.tabs.organisers,
    rsvps: t.tabs.rsvps,
    'signup-code': t.tabs.signupCode,
  };
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

  const contentPanel = (render: (content: SiteContent) => ReactNode) => (
    <>
      {state.status === 'loading' && (
        <p className={styles.intro} role="status">
          …
        </p>
      )}
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
      {state.status === 'ready' && render(state.content)}
    </>
  );

  return (
    <div className={styles.page} data-layout="wide">
      <CardHeader id="site-settings-title" eyebrow={t.eyebrow} title={t.title} />
      <p className={styles.intro}>{t.intro}</p>

      <RouteTabs
        id="site-settings"
        label={t.tabs.label}
        current={tab}
        tabs={SETTINGS_TABS.map((id) => ({ id, label: tabLabels[id], to: siteSettingsPath(id) }))}
      />
      <RouteTabPanel id="site-settings" current={tab} className={styles.tabPanel}>
        {tab === 'general' && contentPanel((content) => <SiteSettingsForm content={content} onSave={save} />)}
        {tab === 'photos' &&
          contentPanel((content) => <PhotosEditor content={content} repository={repository} onChange={update} />)}
        {tab === 'organisers' && <UsersEditor />}
        {tab === 'rsvps' && <RsvpsList />}
        {tab === 'signup-code' && <SignupCodeForm />}
      </RouteTabPanel>

      <Link to={AREA_HOME} className={`${formStyles.secondary} ${styles.back}`}>
        {t.back}
      </Link>
    </div>
  );
}
