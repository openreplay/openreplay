import { Divider, Menu, Tag, Typography, Popover, Button } from 'antd';
import cn from 'classnames';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { observer } from 'mobx-react-lite';

import SupportModal from 'App/layout/SupportModal';
import * as routes from 'App/routes';
import {
  CLIENT_DEFAULT_TAB,
  CLIENT_TABS,
  client,
  withSiteId,
} from 'App/routes';
import { MODULES } from 'Components/Client/Modules';
import { Icon } from 'UI';
import SVG from 'UI/SVG';

import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import InitORCard from './InitORCard';
import SpotToOpenReplayPrompt from './SpotToOpenReplayPrompt';
import {
  MENU,
  PREFERENCES_MENU,
  categories as main_menu,
  preferences,
  spotOnlyCats,
} from './data';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface Props extends RouteComponentProps {
  siteId?: string;
  isCollapsed?: boolean;
}

function SideMenu(props: Props) {
  const { location, isCollapsed } = props;

  const isPreferencesActive = location.pathname.includes('/client/');
  const [supportOpen, setSupportOpen] = React.useState(false);
  const { searchStore, projectsStore, userStore } = useStore();
  const spotOnly = userStore.scopeState === 1;
  const { account } = userStore;
  const modules = account.settings?.modules ?? [];
  const isAdmin = account.admin || account.superAdmin;
  const { isEnterprise } = userStore;
  const { siteId } = projectsStore;
  const { isMobile } = projectsStore;
  const { t, i18n } = useTranslation();

  const menu: any[] = React.useMemo(() => {
    const sourceMenu = isPreferencesActive ? preferences(t) : main_menu(t);

    return sourceMenu
      .filter((cat) => {
        if (spotOnly) {
          return spotOnlyCats.includes(cat.key);
        }
        return true;
      })
      .map((category) => {
        const updatedItems = category.items
          .filter((item) => {
            if (spotOnly) {
              return spotOnlyCats.includes(item.key);
            }
            return true;
          })
          .map((item) => {
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
              item.key === MENU.RECOMMENDATIONS &&
                modules.includes(MODULES.RECOMMENDATIONS),
              item.key === MENU.FEATURE_FLAGS &&
                modules.includes(MODULES.FEATURE_FLAGS),
              item.key === MENU.HIGHLIGHTS &&
                modules.includes(MODULES.HIGHLIGHTS),
              item.key === MENU.LIVE_SESSIONS &&
                (modules.includes(MODULES.ASSIST) || isMobile),
              item.key === MENU.ALERTS && modules.includes(MODULES.ALERTS),
              item.key === MENU.USABILITY_TESTS &&
                modules.includes(MODULES.USABILITY_TESTS),
              item.isAdmin && !isAdmin,
              item.isEnterprise && !isEnterprise,
            ].some((cond) => cond);

            return { ...item, hidden: isHidden };
          });

        const allItemsHidden = updatedItems.every((item) => item.hidden);

        return {
          ...category,
          items: updatedItems,
          hidden: allItemsHidden,
        };
      });
  }, [isAdmin, isEnterprise, isPreferencesActive, modules, spotOnly, siteId, i18n.language]);

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
    [MENU.FEATURE_FLAGS]: () => withSiteId(routes.fflags(), siteId),
    [MENU.PREFERENCES]: () => client(CLIENT_DEFAULT_TAB),
    [MENU.USABILITY_TESTS]: () => withSiteId(routes.usabilityTesting(), siteId),
    [MENU.SPOTS]: () => withSiteId(routes.spotsList(), siteId),
    [PREFERENCES_MENU.ACCOUNT]: () => client(CLIENT_TABS.PROFILE),
    [PREFERENCES_MENU.SESSION_LISTING]: () =>
      client(CLIENT_TABS.SESSIONS_LISTING),
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

  function RenderDivider(props: { index: number }) {
    if (props.index === 0) return null;
    return <Divider style={{ margin: '6px 0' }} />;
  }
  return (
    <>
      <Menu
        mode="inline"
        onClick={handleClick}
        style={{ marginTop: '8px', border: 'none' }}
        selectedKeys={menu.flatMap((category) =>
          category.items
            .filter((item: any) => isMenuItemActive(item.key))
            .map((item) => item.key),
        )}
      >
        {menu.map((category, index) => (
          <React.Fragment key={category.key}>
            {!category.hidden && (
              <>
                <RenderDivider index={index} />

                {category.items
                  .filter((item: any) => !item.hidden)
                  .map((item: any) => {
                    const isActive = isMenuItemActive(item.key);

                    if (item.key === MENU.EXIT) {
                      return (
                        <Menu.Item
                          key={item.key}
                          style={{ paddingLeft: '20px' }}
                          icon={
                            <Icon
                              name={item.icon}
                              size={16}
                              color={isActive ? 'teal' : ''}
                            />
                          }
                          className={cn('!rounded-lg hover-fill-teal')}
                        >
                          {item.label}
                        </Menu.Item>
                      );
                    }

                    if (item.key === MENU.SPOTS) {
                      return (
                        <Menu.Item
                          key={item.key}
                          icon={
                            <Icon
                              name={item.icon}
                              size={16}
                              color={isActive ? 'teal' : ''}
                            />
                          }
                          style={{ paddingLeft: '20px' }}
                          className={cn('!rounded-lg !pe-0')}
                          itemIcon={
                            item.leading ? (
                              <Icon
                                name={item.leading}
                                size={16}
                                color={isActive ? 'teal' : ''}
                              />
                            ) : null
                          }
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            {item.label}
                            <Tag
                              color="cyan"
                              bordered={false}
                              className="text-xs ml-2"
                            >
                              {t('Beta')}
                            </Tag>
                          </div>
                        </Menu.Item>
                      );
                    }

                    return item.children ? (
                      <Menu.SubMenu
                        key={item.key}
                        title={
                          <Text className={cn('ml-5 !rounded')}>
                            {item.label}
                          </Text>
                        }
                        icon={<SVG name={item.icon} size={16} />}
                      >
                        {item.children.map((child: any) => (
                          <Menu.Item
                            className={cn('ml-8', {
                              'ant-menu-item-selected !bg-active-dark-blue':
                                isMenuItemActive(child.key),
                            })}
                            key={child.key}
                          >
                            {child.label}
                          </Menu.Item>
                        ))}
                      </Menu.SubMenu>
                    ) : (
                      <Menu.Item
                        key={item.key}
                        icon={
                          <Icon
                            name={item.icon}
                            size={16}
                            color={isActive ? 'teal' : ''}
                            className="hover-fill-teal"
                          />
                        }
                        style={{ paddingLeft: '20px' }}
                        className={cn('!rounded-lg hover-fill-teal')}
                        itemIcon={
                          item.leading ? (
                            <Icon
                              name={item.leading}
                              size={16}
                              color={isActive ? 'teal' : ''}
                            />
                          ) : null
                        }
                      >
                        {item.label}
                      </Menu.Item>
                    );
                  })}
              </>
            )}
          </React.Fragment>
        ))}
      </Menu>
      {spotOnly && !isPreferencesActive ? (
        <SpotMenuItem isCollapsed={isCollapsed} />
      ) : null}
      <SupportModal onClose={() => setSupportOpen(false)} open={supportOpen} />
    </>
  );
}

export default withRouter(observer(SideMenu));

function SpotMenuItem({ isCollapsed }: any) {
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  return (
    <>
      <SpotToOpenReplayPrompt
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
      />
      {isCollapsed ? (
        <Popover
          content={<InitORCard onOpenModal={() => setIsModalVisible(true)} />}
          trigger="hover"
          placement="right"
        >
          <Button type="text" className="ml-2 mt-2 py-2">
            <AnimatedSVG name={ICONS.LOGO_SMALL} size={20} />
          </Button>
        </Popover>
      ) : (
        <InitORCard onOpenModal={() => setIsModalVisible(true)} />
      )}
    </>
  );
}
