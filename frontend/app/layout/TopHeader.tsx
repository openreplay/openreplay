import { Layout } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import { useStore } from 'App/mstore';

const { Header } = Layout;

interface Props {
  /** Set when no sider is on screen to carry the logo (mobile, onboarding). */
  showLogo?: boolean;
}

function TopHeader({ showLogo }: Props) {
  const { userStore, notificationStore, projectsStore } = useStore();
  const { account } = userStore;
  const { siteId } = projectsStore;
  const { initialDataFetched } = userStore;

  // the badge is a dot, not a number — it can wait until the first screen has
  // painted. Limits are fetched by the settings screens that read them.
  useEffect(() => {
    if (!account.id || initialDataFetched) return;
    const handle = setTimeout(() => {
      notificationStore
        .fetchNotificationsCount()
        .catch(() => {})
        .then(() => {
          userStore.updateKey('initialDataFetched', true);
        });
    }, 0);
    return () => clearTimeout(handle);
  }, [account]);

  return (
    <Header
      style={{
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
      }}
      className={showLogo ? 'justify-between' : 'justify-end'}
    >
      {/* the logo normally sits at the top of the sider, so it stays put with the
          menu; it falls back to the header on routes that render no sider */}
      {showLogo ? <Logo siteId={siteId} /> : null}
      <TopRight />
    </Header>
  );
}

export default observer(TopHeader);
