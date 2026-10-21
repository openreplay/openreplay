import { IconButton } from '@/ui/actions/IconButton';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { useViewportAttribute } from '@/ui/layout/use-viewport';
import { Drawer } from '@/ui/overlays/drawer';
import AppBanners from 'Saas/layout/AppBanners';
import { PanelLeftOpen, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Survey from 'App/components/Survey';
import HeaderBanners from 'App/layout/HeaderBanners';
import { useStore } from 'App/mstore';

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
  const { t } = useTranslation();
  const { collapsed, toggle } = useNavCollapse(immersive, !bare);
  // at phone the rail is a sheet behind the bar's menu button
  const phone = useViewportAttribute() === 'phone';
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!phone) setMobileOpen(false);
  }, [phone]);

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
    <div className="m-app">
      <AppBanners />
      <div className="m-shell">
        {phone ? (
          <div className="m-shell__bar">
            <IconButton
              icon={<PanelLeftOpen size={16} />}
              label={t('Open the menu')}
              variant="ghost"
              onClick={() => setMobileOpen(true)}
            />
            <OpenReplayMark size={16} className="m-shell__bar-mark" />
            <span className="m-shell__bar-name">OpenReplay</span>
          </div>
        ) : (
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
        {phone ? (
          <Drawer
            side="left"
            label={t('Navigation')}
            className="m-mobile-nav w-[280px]!"
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
          >
            <span className="m-mobile-nav__close">
              <IconButton
                icon={<X size={15} />}
                label={t('Close the menu')}
                variant="ghost"
                onClick={() => setMobileOpen(false)}
              />
            </span>
            <SideNav
              collapsed={false}
              onToggleCollapsed={() => setMobileOpen(false)}
              onNavigated={() => setMobileOpen(false)}
            />
          </Drawer>
        ) : null}
      </div>
    </div>
  );
}

export default observer(Layout);
