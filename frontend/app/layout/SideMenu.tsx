import React from 'react';
import { Divider, Menu, Tooltip, Typography } from 'antd';
import SVG from 'UI/SVG';
import * as routes from 'App/routes';
import { bookmarks, client, CLIENT_DEFAULT_TAB, CLIENT_TABS, fflags, notes, sessions, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { categories as main_menu, MENU, preferences, PREFERENCES_MENU } from './data';
import { connect } from 'react-redux';
import { MODULES } from 'Components/Client/Modules';
import cn from 'classnames';
import { Icon } from 'UI';
import SupportModal from 'App/layout/SupportModal';
import { setActiveTab } from 'Duck/search';

const { Text } = Typography;

const TabToUrlMap = {
  all: sessions() as '/sessions',
  bookmark: bookmarks() as '/bookmarks',
  notes: notes() as '/notes',
  flags: fflags() as '/feature-flags'
};


interface Props extends RouteComponentProps {
  siteId?: string;
  modules: string[];
  setActiveTab: (tab: any) => void;
  activeTab: string;
  isEnterprise: boolean;
  isCollapsed?: boolean;
}


function SideMenu(props: Props) {
  // @ts-ignore
  const { activeTab, siteId, modules, location, account, isEnterprise, isCollapsed } = props;
  const isPreferencesActive = location.pathname.includes('/client/');
  const [supportOpen, setSupportOpen] = React.useState(false);
  const isAdmin = account.admin || account.superAdmin;


  let menu: any[] = React.useMemo(() => {
    const sourceMenu = isPreferencesActive ? preferences : main_menu;

    return sourceMenu.map(category => {
      const updatedItems = category.items.map(item => {
        if (isEnterprise) {
          if (item.key === MENU.BOOKMARKS) {
            return { ...item, hidden: true };
          }

          if (item.key === MENU.VAULT) {
            return { ...item, hidden: false };
          }
        } else {
          if (item.key === MENU.VAULT) {
            return { ...item, hidden: true };
          }

          if (item.key === MENU.BOOKMARKS) {
            return { ...item, hidden: false };
          }
        }
        if (item.hidden) return item;

        const isHidden = [
          (item.key === MENU.STATS && modules.includes(MODULES.ASSIST_STATS)),
          (item.key === MENU.RECOMMENDATIONS && modules.includes(MODULES.RECOMMENDATIONS)),
          (item.key === MENU.FEATURE_FLAGS && modules.includes(MODULES.FEATURE_FLAGS)),
          (item.key === MENU.NOTES && modules.includes(MODULES.NOTES)),
          (item.key === MENU.LIVE_SESSIONS || item.key === MENU.RECORDINGS || item.key === MENU.STATS) && modules.includes(MODULES.ASSIST),
          (item.key === MENU.SESSIONS && modules.includes(MODULES.OFFLINE_RECORDINGS)),
          (item.key === MENU.ALERTS && modules.includes(MODULES.ALERTS)),
          (item.isAdmin && !isAdmin),
          (item.isEnterprise && !isEnterprise),
        ].some(cond => cond);

        return { ...item, hidden: isHidden };
      });

      // Check if all items are hidden in this category
      const allItemsHidden = updatedItems.every(item => item.hidden);

      return {
        ...category,
        items: updatedItems,
        hidden: allItemsHidden // Set the hidden flag for the category
      };
    });
  }, [isAdmin, isEnterprise, isPreferencesActive, modules]);


  React.useEffect(() => {
    const currentLocation = location.pathname;
    const tab = Object.keys(TabToUrlMap).find((tab: keyof typeof TabToUrlMap) => currentLocation.includes(TabToUrlMap[tab]));
    if (tab && tab !== activeTab) {
      props.setActiveTab({ type: tab });
    }
  }, [location.pathname]);


  const menuRoutes: any = {
    [MENU.EXIT]: () => props.history.push(withSiteId(routes.sessions(), siteId)),
    [MENU.SESSIONS]: () => withSiteId(routes.sessions(), siteId),
    [MENU.BOOKMARKS]: () => withSiteId(routes.bookmarks(), siteId),
    [MENU.VAULT]: () => withSiteId(routes.bookmarks(), siteId),
    [MENU.NOTES]: () => withSiteId(routes.notes(), siteId),
    [MENU.LIVE_SESSIONS]: () => withSiteId(routes.assist(), siteId),
    [MENU.STATS]: () => withSiteId(routes.assistStats(), siteId),
    [MENU.RECORDINGS]: () => withSiteId(routes.recordings(), siteId),
    [MENU.DASHBOARDS]: () => withSiteId(routes.dashboard(), siteId),
    [MENU.CARDS]: () => withSiteId(routes.metrics(), siteId),
    [MENU.ALERTS]: () => withSiteId(routes.alerts(), siteId),
    [MENU.FEATURE_FLAGS]: () => withSiteId(routes.fflags(), siteId),
    [MENU.PREFERENCES]: () => client(CLIENT_DEFAULT_TAB),
    [MENU.USABILITY_TESTS]: () => withSiteId(routes.usabilityTesting(), siteId),
    [PREFERENCES_MENU.ACCOUNT]: () => client(CLIENT_TABS.PROFILE),
    [PREFERENCES_MENU.SESSION_LISTING]: () => client(CLIENT_TABS.SESSIONS_LISTING),
    [PREFERENCES_MENU.INTEGRATIONS]: () => client(CLIENT_TABS.INTEGRATIONS),
    [PREFERENCES_MENU.METADATA]: () => client(CLIENT_TABS.CUSTOM_FIELDS),
    [PREFERENCES_MENU.WEBHOOKS]: () => client(CLIENT_TABS.WEBHOOKS),
    [PREFERENCES_MENU.PROJECTS]: () => client(CLIENT_TABS.SITES),
    [PREFERENCES_MENU.ROLES_ACCESS]: () => client(CLIENT_TABS.MANAGE_ROLES),
    [PREFERENCES_MENU.AUDIT]: () => client(CLIENT_TABS.AUDIT),
    [PREFERENCES_MENU.TEAM]: () => client(CLIENT_TABS.MANAGE_USERS),
    [PREFERENCES_MENU.NOTIFICATIONS]: () => client(CLIENT_TABS.NOTIFICATIONS),
    [PREFERENCES_MENU.BILLING]: () => client(CLIENT_TABS.BILLING),
    [PREFERENCES_MENU.MODULES]: () => client(CLIENT_TABS.MODULES)
  };

  const handleClick = (item: any) => {
    if (item.key === MENU.SUPPORT) {
      setSupportOpen(true);
      return;
    }
    const handler = menuRoutes[item.key];
    if (handler) {
      const route = handler();
      pushTo(route);
    }
  };

  const isMenuItemActive = (key: string) => {
    const { pathname } = location;
    const activeRoute = menuRoutes[key];

    if (activeRoute && !key.includes('exit')) {
      const route = activeRoute();
      return pathname === route;
    }
    return false;
  };


  const pushTo = (path: string) => {
    props.history.push(path);
  };


  return (
    <>
      <Menu
        mode='inline' onClick={handleClick}
        style={{ marginTop: '8px', border: 'none' }}
        selectedKeys={menu.flatMap(category => category.items.filter((item: any) => isMenuItemActive(item.key)).map(item => item.key))}
      >
        {menu.map((category, index) => (
          <React.Fragment key={category.key}>
            {!category.hidden && (
              <>
                {index > 0 && <Divider style={{ margin: '6px 0' }} />}

                  {category.items.filter((item: any) => !item.hidden).map((item: any) => {
                    const isActive = isMenuItemActive(item.key);

                    if (item.key === MENU.EXIT) {
                      return (
                        <Menu.Item
                          key={item.key}
                          style={{ paddingLeft: '20px' }}
                          icon={<Icon name={item.icon} size={16} color={isActive ? 'teal' : ''} />}
                          className={cn('!rounded hover-fill-teal')}
                        >
                          {item.label}
                        </Menu.Item>
                      );
                    }

                    return item.children ? (
                      <Menu.SubMenu
                        key={item.key}
                        title={<Text className={cn('ml-5 !rounded')}>{item.label}</Text>}
                        icon={<SVG name={item.icon} size={16} />}>
                        {/*style={{ paddingLeft: '30px' }}*/}
                        {item.children.map((child: any) => <Menu.Item
                          className={cn('ml-8', { 'ant-menu-item-selected !bg-active-dark-blue': isMenuItemActive(child.key) })}
                          key={child.key}>{child.label}</Menu.Item>)}
                      </Menu.SubMenu>
                    ) : (
                      <Menu.Item
                        key={item.key}
                        icon={<Icon name={item.icon} size={16} color={isActive ? 'teal' : ''}
                                    className={'hover-fill-teal'} />}
                        style={{ paddingLeft: '20px' }}
                        className={cn('!rounded hover-fill-teal')}
                        itemIcon={item.leading ?
                          <Icon name={item.leading} size={16} color={isActive ? 'teal' : ''} /> : null}>
                        {item.label}
                      </Menu.Item>
                    );
                  })}

              </>
            )}
          </React.Fragment>
        ))}
      </Menu>
      <SupportModal
        onClose={() => {
          setSupportOpen(false);
        }} open={supportOpen} />
    </>
  );
}

export default withRouter(
  connect((state: any) => ({
      modules: state.getIn(['user', 'account', 'settings', 'modules']) || [],
      activeTab: state.getIn(['search', 'activeTab', 'type']),
      isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
      account: state.getIn(['user', 'account'])
    }),
    { setActiveTab }
  )(SideMenu)
);
