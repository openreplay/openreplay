import { Button, Drawer } from 'antd';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import MenuContent from './MenuContent';

import SupportModal from 'App/layout/SupportModal';
import * as routes from 'App/routes';
import {
  CLIENT_DEFAULT_TAB,
  CLIENT_TABS,
  client,
  withSiteId,
} from 'App/routes';
import { MODULES } from 'Components/Client/Modules/extra';
import { hasAi } from 'App/utils/split-utils';
// added: util-based mobile detection
import { mobileScreen } from 'App/utils/isMobile';
import { useStore } from 'App/mstore';
import {
  MENU,
  PREFERENCES_MENU,
  categories as main_menu,
  preferences,
} from '../data';
import { useTranslation } from 'react-i18next';
import { extraRoutes } from '../menuRoutes';
import { Menu, X } from 'lucide-react';

interface Props extends RouteComponentProps {
  siteId?: string;
  isCollapsed?: boolean;
}

function SideMenu(props: Props) {
  const { location, isCollapsed } = props;

  const isPreferencesActive = location.pathname.includes('/client/');
  const [supportOpen, setSupportOpen] = React.useState(false);
  // added: mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const { projectsStore, userStore } = useStore();
  const { account } = userStore;
  const modules = account.settings?.modules ?? [];
  const isAdmin = account.admin || account.superAdmin;
  const { isEnterprise } = userStore;
  const { siteId } = projectsStore;
  // added: call util once per render
  const isMobile = mobileScreen;
  const { t, i18n } = useTranslation();

  const menu: any[] = React.useMemo(() => {
    const sourceMenu = isPreferencesActive ? preferences(t) : main_menu(t);

    return sourceMenu.map((category) => {
      const updatedItems = category.items.map((item) => {
        if (isEnterprise) {
          if (item.key === MENU.BOOKMARKS) return { ...item, hidden: true };
          if (item.key === MENU.VAULT) return { ...item, hidden: false };
        } else {
          if (item.key === MENU.VAULT) return { ...item, hidden: true };
          if (item.key === MENU.BOOKMARKS) return { ...item, hidden: false };
        }
        if (item.hidden) return item;

        const isHidden = [
          item.key === MENU.RECOMMENDATIONS &&
            modules.includes(MODULES.RECOMMENDATIONS),
          item.key === MENU.HIGHLIGHTS && modules.includes(MODULES.HIGHLIGHTS),
          item.key === MENU.LIVE_SESSIONS &&
            (modules.includes(MODULES.ASSIST) || isMobile),
          item.key === MENU.ALERTS && modules.includes(MODULES.ALERTS),
          item.isAdmin && !isAdmin,
          item.isEnterprise && !isEnterprise,
          item.key === MENU.KAI && !hasAi,
          item.key === PREFERENCES_MENU.EXPORTED_VIDEOS &&
            !account.hasVideoExport,
        ].some(Boolean);

        return { ...item, hidden: isHidden };
      });

      const allItemsHidden = updatedItems.every((i) => i.hidden);
      return { ...category, items: updatedItems, hidden: allItemsHidden };
    });
  }, [
    isAdmin,
    isEnterprise,
    isPreferencesActive,
    modules,
    siteId,
    i18n.language,
    isMobile, // added dep
  ]);

  const menuRoutes: any = {
    [MENU.EXIT]: () =>
      props.history.push(withSiteId(routes.sessions(), siteId)),
    [MENU.SESSIONS]: () => withSiteId(routes.sessions(), siteId),
    [MENU.BOOKMARKS]: () => withSiteId(routes.bookmarks(), siteId),
    [MENU.VAULT]: () => withSiteId(routes.bookmarks(), siteId),
    [MENU.LIVE_SESSIONS]: () => withSiteId(routes.assist(), siteId),
    [MENU.DASHBOARDS]: () => withSiteId(routes.dashboard(), siteId),
    [MENU.CARDS]: () => withSiteId(routes.metrics(), siteId),
    [MENU.ALERTS]: () => withSiteId(routes.alerts(), siteId),
    [MENU.PREFERENCES]: () => client(CLIENT_DEFAULT_TAB),
    [MENU.SPOTS]: () => withSiteId(routes.spotsList(), siteId),
    [PREFERENCES_MENU.ACCOUNT]: () => client(CLIENT_TABS.PROFILE),
    [PREFERENCES_MENU.SESSION_SETTINGS]: () =>
      client(CLIENT_TABS.SESSION_SETTINGS),
    [PREFERENCES_MENU.INTEGRATIONS]: () => client(CLIENT_TABS.INTEGRATIONS),
    [PREFERENCES_MENU.WEBHOOKS]: () => client(CLIENT_TABS.WEBHOOKS),
    [PREFERENCES_MENU.PROJECTS]: () => client(CLIENT_TABS.SITES),
    [PREFERENCES_MENU.ROLES_ACCESS]: () => client(CLIENT_TABS.MANAGE_ROLES),
    [PREFERENCES_MENU.AUDIT]: () => client(CLIENT_TABS.AUDIT),
    [PREFERENCES_MENU.TEAM]: () => client(CLIENT_TABS.MANAGE_USERS),
    [PREFERENCES_MENU.NOTIFICATIONS]: () => client(CLIENT_TABS.NOTIFICATIONS),
    [PREFERENCES_MENU.BILLING]: () => client(CLIENT_TABS.BILLING),
    [PREFERENCES_MENU.MODULES]: () => client(CLIENT_TABS.MODULES),
    [MENU.HIGHLIGHTS]: () => withSiteId(routes.highlights(''), siteId),
    [MENU.KAI]: () => withSiteId(routes.kai(), siteId),
    [PREFERENCES_MENU.EXPORTED_VIDEOS]: () => client(CLIENT_TABS.VIDEOS),
    [MENU.ACTIVITY]: () => withSiteId(routes.dataManagement.activity(), siteId),
    [MENU.USERS]: () => withSiteId(routes.dataManagement.usersList(), siteId),
    [MENU.EVENTS]: () => withSiteId(routes.dataManagement.eventsList(), siteId),
    [MENU.PROPS]: () => withSiteId(routes.dataManagement.properties(), siteId),
    ...extraRoutes(siteId),
  };

  const handleClick = (item: any) => {
    if (item.key === MENU.SUPPORT) {
      setSupportOpen(true);
      return;
    }
    const handler = menuRoutes[item.key];
    if (handler) props.history.push(handler());
    // added: close drawer after nav on mobile
    if (isMobile) setMobileMenuOpen(false);
  };

  const isMenuItemActive = (key: string) => {
    const { pathname } = location;
    const activeRoute = menuRoutes[key];
    return activeRoute && !key.includes('exit')
      ? pathname === activeRoute()
      : false;
  };

  return (
    <>
      {!isMobile && (
        <MenuContent
          menu={menu}
          isMenuItemActive={isMenuItemActive}
          handleClick={handleClick}
          isCollapsed={isCollapsed}
        />
      )}

      {isMobile && (
        <>
          <Drawer
            placement="bottom"
            styles={{
              body: {
                padding: 0,
                overflowY: 'auto',
                background: 'var(--color-gray-lightest)',
              },
            }}
            height={520}
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            closeIcon={false}
          >
            {
              <MenuContent
                menu={menu}
                isMenuItemActive={isMenuItemActive}
                handleClick={handleClick}
                isCollapsed={isCollapsed}
              />
            }
          </Drawer>

          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        </>
      )}

      <SupportModal onClose={() => setSupportOpen(false)} open={supportOpen} />
    </>
  );
}

export default withRouter(observer(SideMenu));
