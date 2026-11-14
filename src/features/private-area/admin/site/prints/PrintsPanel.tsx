import { useParams } from 'react-router';
import { RouteTabPanel, RouteTabs } from '../../../../../components/RouteTabs/RouteTabs';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue';
import { useMessages } from '../../../../../i18n';
import { isPrintTab, PRINT_TABS, printsPath, type PrintTab } from '../../../game/suits';
import { printMessages } from '../../../messages/prints';
import { InvitationDesigner } from './InvitationDesigner';
import { LogoDesigner } from './LogoDesigner';
import { PostersPrints } from './PostersPrints';
import styles from './prints.module.css';
import { useSavedDesign } from './useSavedDesign';
import { WebsiteField } from './WebsiteField';

/** null: the address the page is opened at (the live site's, in production). */
interface Website {
  url: string | null;
}

function sanitizeWebsite(raw: unknown): Website {
  const url = raw && typeof raw === 'object' ? (raw as { url?: unknown }).url : null;
  // The page's own address is the default: not kept as a fixed one.
  return { url: typeof url === 'string' && url.trim() && url !== window.location.origin ? url.slice(0, 300) : null };
}

/**
 * Super admins: everything to print, made in the browser from the current
 * data, one sub-tab each (/area/site/prints/<sub>): the logo designer, the
 * invitation designer and the clubs posters. Nothing is stored on the server.
 */
export function PrintsPanel() {
  const t = useMessages(printMessages);
  const param = useParams().sub;
  const tab: PrintTab = isPrintTab(param) ? param : 'logo';
  // The address in the QR codes: this site's, unless changed (saved on the account).
  const website = useSavedDesign('website', { sanitize: sanitizeWebsite, legacyKey: 'wedding.prints.website.v1' });
  const address = website.design?.url ?? window.location.origin;
  const url = useDebouncedValue(address.trim().replace(/\/+$/, ''), 500);

  return (
    <div className={styles.panel}>
      <RouteTabs
        id="prints"
        label={t.tabs.label}
        current={tab}
        tabs={PRINT_TABS.map((id) => ({ id, label: t.tabs[id], to: printsPath(id) }))}
      />
      <RouteTabPanel id="prints" current={tab} className={styles.panel}>
        {tab !== 'logo' && (
          <WebsiteField
            value={address}
            onChange={(value) => website.setDesign({ url: value })}
            // Back to following the site's own address.
            onReset={website.design?.url != null ? () => website.setDesign({ url: null }) : undefined}
            disabled={!website.design}
            error={website.status === 'error' ? website.error : null}
          />
        )}
        {tab === 'logo' && <LogoDesigner />}
        {tab === 'invitations' && <InvitationDesigner url={url} />}
        {tab === 'posters' && <PostersPrints url={url} />}
      </RouteTabPanel>
    </div>
  );
}
