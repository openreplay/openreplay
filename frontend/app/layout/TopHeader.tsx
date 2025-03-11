import { Layout, Space, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { INDEXES } from 'App/constants/zindex';
import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';

const { Header } = Layout;

function TopHeader() {
  const { userStore, notificationStore, projectsStore, settingsStore } =
    useStore();
  const { account } = userStore;
  const { siteId } = projectsStore;
  const { initialDataFetched } = userStore;
  const { t } = useTranslation();

  useEffect(() => {
    if (!account.id || initialDataFetched) return;
    Promise.all([
      userStore.fetchLimits(),
      notificationStore.fetchNotificationsCount(),
    ]).then(() => {
      userStore.updateKey('initialDataFetched', true);
    });
  }, [account]);

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: INDEXES.HEADER,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
      }}
      className="justify-between"
    >
      <Space>
        <div
          onClick={() => {
            settingsStore.updateMenuCollapsed(!settingsStore.menuCollapsed);
          }}
          style={{ paddingTop: '4px' }}
          className="cursor-pointer xl:block hidden"
        >
          <Tooltip
            title={
              settingsStore.menuCollapsed ? t('Show Menu') : t('Hide Menu')
            }
            mouseEnterDelay={1}
          >
            <Icon
              name={
                settingsStore.menuCollapsed
                  ? 'side_menu_closed'
                  : 'side_menu_open'
              }
              size={20}
            />
          </Tooltip>
        </div>

        <div className="flex items-center">
          <Logo siteId={siteId} />
        </div>
      </Space>

      <TopRight />
    </Header>
  );
}

export default observer(TopHeader);
