import React from 'react';
import { Divider, Menu, Typography } from 'antd';
import SVG from 'UI/SVG';
import * as routes from 'App/routes';
import { client, CLIENT_DEFAULT_TAB, CLIENT_TABS, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { categories, MENU, preferences, PREFERENCES_MENU } from './data';

const { Text } = Typography;


interface Props {
  siteId?: string;
}


function SideMenu(props: RouteComponentProps<Props>) {
  // @ts-ignore
  const { siteId } = props;
  const isPreferencesActive = props.location.pathname.includes('/client/');

  const menuRoutes: any = {
    exit: () => props.history.push(withSiteId(routes.sessions(), siteId)),
    [MENU.SESSIONS]: () => withSiteId(routes.sessions(), siteId),
    [MENU.BOOKMARKS]: () => withSiteId(routes.bookmarks(), siteId),
    [MENU.NOTES]: () => withSiteId(routes.notes(), siteId),
    [MENU.LIVE_SESSIONS]: () => withSiteId(routes.assist(), siteId),
    [MENU.RECORDINGS]: () => withSiteId(routes.recordings(), siteId),
    [MENU.DASHBOARDS]: () => withSiteId(routes.dashboard(), siteId),
    [MENU.CARDS]: () => withSiteId(routes.metrics(), siteId),
    [MENU.ALERTS]: () => withSiteId(routes.alerts(), siteId),
    [MENU.FEATURE_FLAGS]: () => withSiteId(routes.fflags(), siteId),
    [MENU.PREFERENCES]: () => client(CLIENT_DEFAULT_TAB),
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
  };

  const handleClick = (item: any) => {
    const handler = menuRoutes[item.key];
    if (handler) {
      const route = handler();
      pushTo(route);
    }
  };

  const isMenuItemActive = (key: string) => {
    const { pathname } = props.location;
    const activeRoute = menuRoutes[key];
    if (activeRoute) {
      const route = activeRoute();
      return pathname.startsWith(route);
    }
    return false;
  };


  const pushTo = (path: string) => {
    props.history.push(path);
  };




  return (
    <Menu defaultSelectedKeys={['1']} mode='inline' onClick={handleClick}
          style={{ backgroundColor: '#f6f6f6', border: 'none' }}>
      {isPreferencesActive && <Menu.Item key='exit' icon={<SVG name='arrow-bar-left' />}>
        <Text className='ml-2'>Exit</Text>
      </Menu.Item>}
      {(isPreferencesActive ? preferences : categories).map((category, index) => (
        <React.Fragment key={category.key}>
          {index > 0 && <Divider style={{ margin: '6px 0' }} />}
          <Menu.ItemGroup key={category.key}
                          title={<Text className='uppercase text-sm' type='secondary'>{category.title}</Text>}>
            {category.items.map((item) => item.children ? (
              <Menu.SubMenu key={item.key} title={<Text className='ml-2'>{item.label}</Text>}
                            icon={<SVG name={item.icon} size={16} />}>
                {item.children.map((child) => <Menu.Item key={child.key}>{child.label}</Menu.Item>)}
              </Menu.SubMenu>
            ) : (
              <Menu.Item key={item.key} icon={<SVG name={item.icon} size={16} />}
                         style={{ color: '#333' }}
                         className={isMenuItemActive(item.key) ? 'ant-menu-item-selected bg-active-blue color-teal' : ''}>
                <Text className='ml-2'>{item.label}</Text>
              </Menu.Item>
            ))}
          </Menu.ItemGroup>
        </React.Fragment>
      ))}
    </Menu>
  );
}

export default withRouter(SideMenu);
