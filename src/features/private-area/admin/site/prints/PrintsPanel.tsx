import { useParams } from 'react-router';
import { RouteTabPanel, RouteTabs } from '../../../../../components/RouteTabs/RouteTabs';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue';
import { usePersistentState } from '../../../../../hooks/usePersistentState';
import { useMessages } from '../../../../../i18n';
import { isPrintTab, PRINT_TABS, printsPath, type PrintTab } from '../../../game/suits';
import { printMessages } from '../../../messages/prints';
import { InvitationDesigner } from './InvitationDesigner';
import { LogoDesigner } from './LogoDesigner';
import { PostersPrints } from './PostersPrints';
import styles from './prints.module.css';
import { WebsiteField } from './WebsiteField';

/**
 * Super admins: everything to print, made in the browser from the current
 * data, one sub-tab each (/area/site/prints/<sub>): the logo designer, the
 * invitation designer and the clubs posters. Nothing is stored on the server.
 */
export function PrintsPanel() {
  const t = useMessages(printMessages);
  const param = useParams().sub;
  const tab: PrintTab = isPrintTab(param) ? param : 'logo';
  // The address in the QR codes: the site's, unless changed (kept in this browser).
  const [website, setWebsite] = usePersistentState('prints.website.v1', { url: window.location.origin });
  const url = useDebouncedValue(website.url.trim().replace(/\/+$/, ''), 500);

  return (
    <div className={styles.panel}>
      <RouteTabs
        id="prints"
        label={t.tabs.label}
        current={tab}
        tabs={PRINT_TABS.map((id) => ({ id, label: t.tabs[id], to: printsPath(id) }))}
      />
      <RouteTabPanel id="prints" current={tab} className={styles.panel}>
        {tab !== 'logo' && <WebsiteField value={website.url} onChange={(value) => setWebsite({ url: value })} />}
        {tab === 'logo' && <LogoDesigner />}
        {tab === 'invitations' && <InvitationDesigner url={url} />}
        {tab === 'posters' && <PostersPrints url={url} />}
      </RouteTabPanel>
    </div>
  );
}
