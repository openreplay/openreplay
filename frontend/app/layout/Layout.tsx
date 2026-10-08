import { Drawer } from '@/ui/overlays/drawer';
import { Menu, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import Survey from 'App/components/Survey';
import HeaderBanners from 'App/layout/HeaderBanners';
import { useStore } from 'App/mstore';
import { mobileScreen } from 'App/utils/isMobile';

import SessionsDockHost from 'Shared/SessionsDock/SessionsDockHost';

import './app-shell.css';
import SideNav from './nav/SideNav';
import { useNavCollapse } from './nav/useNavCollapse';

const NOTIFICATIONS_REFRESH = 5 * 60 * 1000;

interface Props {
  children: React.ReactNode;
  /** Replay-like routes: the menu folds to its rail and the page gets the full plane. */
  immersive?: boolean;
  /** No menu at all (iframe embeds, MCP authorize). */
  bare?: boolean;
}

function Layout({ children, immersive = false, bare = false }: Props) {
  const { userStore, notificationStore } = useStore();
  const { account, initialDataFetched } = userStore;
  const { collapsed, toggle } = useNavCollapse(immersive, !bare);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!account.id || initialDataFetched) return;
    const handle = setTimeout(() => {
      notificationStore
        .fetchNotificationsCount()
        .catch(() => {})
        .then(() => userStore.updateKey('initialDataFetched', true));
    }, 0);
    return () => clearTimeout(handle);
  }, [account]);

  useEffect(() => {
    if (bare) return;
    const interval = setInterval(() => {
      notificationStore.fetchNotificationsCount().catch(() => {});
    }, NOTIFICATIONS_REFRESH);
    return () => clearInterval(interval);
  }, [bare]);

  if (bare) {
    return (
      <div className="m-shell is-bare">
        <main className="m-shell__main" data-route-scroll>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="m-shell">
      {mobileScreen ? null : (
        <SideNav collapsed={collapsed} onToggleCollapsed={toggle} />
      )}
      <main
        data-route-scroll
        className={`m-shell__main${immersive ? ' is-immersive' : ''}`}
        data-scroll-root
      >
        <HeaderBanners />
        {children}
        <SessionsDockHost />
        <Survey />
      </main>
      {mobileScreen ? (
        <>
          <Drawer
            side="left"
            label="Navigation"
            className="m-mobile-nav w-[280px]!"
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
          >
            <SideNav
              collapsed={false}
              onToggleCollapsed={() => setMobileOpen(false)}
              onNavigated={() => setMobileOpen(false)}
            />
          </Drawer>
          <button
            type="button"
            className="m-mobile-nav__fab"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </>
      ) : null}
    </div>
  );
}

export default observer(Layout);
