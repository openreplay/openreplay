import React, { FC } from 'react';
import { Menu, Divider, Typography } from 'antd';
import SVG from 'UI/SVG';
import * as routes from 'App/routes';
import { client, CLIENT_DEFAULT_TAB, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { categories, preferences } from './data';

const { Text } = Typography;


interface Props {
  siteId?: string;
}


function SideMenu(props: RouteComponentProps<Props>) {
  // @ts-ignore
  const { siteId } = props;
  const isPreferencesActive = props.location.pathname.includes('/client/');

  const isMenuItemActive = (key: string) => {
    const { pathname } = props.location;
    switch (key) {
      case 'sessions':
        return pathname.startsWith(withSiteId(routes.sessions(), siteId));
      case 'bookmarks':
        return pathname.startsWith(withSiteId(routes.bookmarks(), siteId));
      case 'notes':
        return pathname.startsWith(withSiteId(routes.notes(), siteId));
      case 'live-sessions':
        return pathname.startsWith(withSiteId(routes.assist(), siteId));
      case 'recordings':
        return pathname.startsWith(withSiteId(routes.recordings(), siteId));
      case 'dashboards':
        return pathname.startsWith(withSiteId(routes.dashboard(), siteId));
      case 'alerts':
        return pathname.startsWith(withSiteId(routes.alerts(), siteId));
      case 'feature-flags':
        return pathname.startsWith(withSiteId(routes.fflags(), siteId));
      default:
        return false;
    }
  };

  const pushTo = (path: string) => {
    props.history.push(path);
  };

  const clickHandler = (item: any) => {
    if (item.key === 'exit') return props.history.push(withSiteId(routes.sessions(), siteId));
    switch (item.key) {
      case 'sessions':
        pushTo(withSiteId(routes.sessions(), siteId));
        break;
      case 'bookmarks':
        pushTo(withSiteId(routes.bookmarks(), siteId));
        break;
      case 'notes':
        pushTo(withSiteId(routes.notes(), siteId));
        break;
      case 'live-sessions':
        pushTo(withSiteId(routes.assist(), siteId));
        break;
      case 'recordings':
        pushTo(withSiteId(routes.recordings(), siteId));
        break;
      case 'dashboards':
        pushTo(withSiteId(routes.dashboard(), siteId));
        break;
      case 'alerts':
        pushTo(withSiteId(routes.alerts(), siteId));
        break;
      case 'feature-flags':
        pushTo(withSiteId(routes.fflags(), siteId));
        break;
      case 'preferences':
        pushTo(client(CLIENT_DEFAULT_TAB));
        break;
    }
  };
  return (
    <Menu defaultSelectedKeys={['1']} mode='inline' onClick={clickHandler}
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
                            icon={<SVG name={item.icon} />}>
                {item.children.map((child) => <Menu.Item key={child.key}>{child.label}</Menu.Item>)}
              </Menu.SubMenu>
            ) : (
              <Menu.Item key={item.key} icon={<SVG name={item.icon} />}
                         style={{ color: '#333' }}
                         className={isMenuItemActive(item.key) ? 'ant-menu-item-selected' : ''}>
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
