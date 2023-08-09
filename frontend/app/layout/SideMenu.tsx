import React from 'react';
import { Divider, Menu, Typography } from 'antd';
import SVG from 'UI/SVG';
import * as routes from 'App/routes';
import { client, CLIENT_DEFAULT_TAB, CLIENT_TABS, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { categories as main_menu, MENU, preferences, PREFERENCES_MENU } from './data';
import { connect } from 'react-redux';
import { MODULES } from 'Components/Client/Modules';
import cn from 'classnames';
import { Icon } from 'UI';

const { Text } = Typography;


interface Props {
  siteId?: string;
  modules: string[];
}


function SideMenu(props: RouteComponentProps<Props>) {
  // @ts-ignore
  const { siteId, modules } = props;
  const isPreferencesActive = props.location.pathname.includes('/client/');

  let menu = isPreferencesActive ? preferences : main_menu;

  menu.forEach((category) => {
    category.items.forEach((item) => {
      if (item.key === MENU.NOTES && !modules.includes(MODULES.NOTES)) {
        item.hidden = true;
      }

      if ((item.key === MENU.LIVE_SESSIONS || item.key === MENU.RECORDINGS) && !modules.includes(MODULES.ASSIST)) {
        item.hidden = true;
      }

      if (item.key === MENU.SESSIONS && !modules.includes(MODULES.OFFLINE_RECORDINGS)) {
        item.hidden = true;
      }

      if (item.key === MENU.ALERTS && !modules.includes(MODULES.ALERTS)) {
        item.hidden = true;
      }
    });
  });


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
    [PREFERENCES_MENU.MODULES]: () => client(CLIENT_TABS.MODULES)
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
      {(isPreferencesActive ? preferences : main_menu).map((category, index) => (
        <React.Fragment key={category.key}>
          {index > 0 && <Divider style={{ margin: '6px 0' }} />}
          <Menu.ItemGroup key={category.key}
                          title={<Text className='uppercase text-sm' type='secondary'>{category.title}</Text>}>
            {category.items.filter((item: any) => !item.hidden).map((item: any) => {
              const isActive = isMenuItemActive(item.key);
              return item.children ? (
                <Menu.SubMenu
                  key={item.key}
                  title={<Text
                    className={cn('ml-5 !rounded')}>{item.label}</Text>}
                  icon={<SVG name={item.icon} size={16} />}>
                  {item.children.map((child: any) => <Menu.Item
                    className={cn('ml-8', { 'ant-menu-item-selected !bg-active-dark-blue': isMenuItemActive(child.key) })}
                    key={child.key}>{child.label}</Menu.Item>)}
                </Menu.SubMenu>
              ) : (
                <Menu.Item key={item.key} icon={<Icon name={item.icon} size={16} color={isActive ? 'teal' : ''} />}
                           style={{ color: '#333' }}
                           className={cn('!rounded', { 'ant-menu-item-selected !bg-active-dark-blue': isActive })}>
                  <Text className={cn('ml-2', { 'color-teal': isActive })}>{item.label}</Text>
                </Menu.Item>
              );
            })}
          </Menu.ItemGroup>
        </React.Fragment>
      ))}
    </Menu>
  );
}

export default withRouter(connect((state: any) => ({
  modules: state.getIn(['user', 'account', 'modules']) || []
}))(SideMenu));
