import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import styles from './RouteTabs.module.css';

export interface RouteTab {
  id: string;
  label: ReactNode;
  /** Each tab has its own address: it can be bookmarked and the Back button works. */
  to: string;
}

interface RouteTabsProps {
  /** Prefix of the ids linking the tabs to their panel (unique on the page). */
  id: string;
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly RouteTab[];
  current: string;
}

const tabId = (id: string, tab: string) => `${id}-tab-${tab}`;
const panelId = (id: string) => `${id}-panel`;

/**
 * Tabs that are pages: selecting one navigates to its address. Arrow keys,
 * Home and End move between tabs (WAI-ARIA tabs pattern, automatic
 * activation); only the selected tab is in the Tab order.
 */
export function RouteTabs({ id, label, tabs, current }: RouteTabsProps) {
  const navigate = useNavigate();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    buttons.current[target]?.focus();
    navigate(tabs[target].to);
  };

  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          id={tabId(id, tab.id)}
          type="button"
          role="tab"
          aria-selected={tab.id === current}
          aria-controls={panelId(id)}
          tabIndex={tab.id === current ? 0 : -1}
          className={styles.tab}
          onClick={() => navigate(tab.to)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** The content of the selected tab of the `RouteTabs` with the same `id`. */
export function RouteTabPanel({
  id,
  current,
  className,
  children,
}: {
  id: string;
  current: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={panelId(id)}
      role="tabpanel"
      aria-labelledby={tabId(id, current)}
      className={className}
      // The panel itself can take the focus, as the tabs pattern expects.
      tabIndex={0}
    >
      {children}
    </div>
  );
}
