import { Layout } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import { useStore } from 'App/mstore';
import { mobileScreen } from 'App/utils/isMobile';

const { Header } = Layout;

function TopHeader() {
  const { userStore, notificationStore, projectsStore } = useStore();
  const { account } = userStore;
  const { siteId } = projectsStore;
  const { initialDataFetched } = userStore;

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
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
      }}
      className={mobileScreen ? 'justify-between' : 'justify-end'}
    >
      {/* on desktop the logo sits at the top of the sider, so it stays put with the menu */}
      {mobileScreen ? <Logo siteId={siteId} /> : null}
      <TopRight />
    </Header>
  );
}

export default observer(TopHeader);
