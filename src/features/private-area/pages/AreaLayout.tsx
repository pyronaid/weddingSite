import type { ReactNode } from 'react';
import { Link } from 'react-router';
import formStyles from '../../../components/Form/Form.module.css';
import { CardHeader } from '../../../components/InfoCard/CardHeader';
import { RouteTabPanel, RouteTabs } from '../../../components/RouteTabs/RouteTabs';
import { useMessages } from '../../../i18n';
import { isOrganiser } from '../../../services/auth';
import { ORGANISE_PATH } from '../game/suits';
import { AREA_HOME } from '../guards';
import { adminMessages } from '../messages/admin';
import { authMessages } from '../messages/auth';
import { useAuth } from '../useAuth';
import styles from './pages.module.css';

export type AreaTab = 'game' | 'organise';

/**
 * The private area home: greeting, then the guest's game. Organisers get two
 * tabs instead, "My game" (/area) and "Organise" (/area/admin), so their game
 * and their work stay apart. Everybody can log out from here.
 */
export function AreaLayout({ current, children }: { current: AreaTab; children: ReactNode }) {
  const t = useMessages(authMessages);
  const tabs = useMessages(adminMessages).organise.tabs;
  const { user, auth } = useAuth();
  const firstName = user?.name.split(' ')[0] || t.dashboard.friend;
  const organiser = isOrganiser(user);

  return (
    // Organisers' cards to edit need the room; both tabs share it so the page keeps its width.
    <div className={styles.stack} data-layout={organiser ? 'wide' : undefined}>
      <CardHeader id="dashboard-title" eyebrow={t.privateArea} title={t.dashboard.hello(firstName)} />

      {organiser ? (
        <>
          <RouteTabs
            id="area"
            label={tabs.label}
            current={current}
            tabs={[
              { id: 'game', label: `🎴 ${tabs.game}`, to: AREA_HOME },
              { id: 'organise', label: `✎ ${tabs.organise}`, to: ORGANISE_PATH },
            ]}
          />
          <RouteTabPanel id="area" current={current} className={styles.stack}>
            {children}
          </RouteTabPanel>
        </>
      ) : (
        children
      )}

      <button type="button" className={formStyles.secondary} onClick={() => auth.logout()}>
        {t.dashboard.logOut}
      </button>
      <div className={styles.links}>
        <Link to="/">{t.dashboard.backToSite}</Link>
      </div>
    </div>
  );
}
