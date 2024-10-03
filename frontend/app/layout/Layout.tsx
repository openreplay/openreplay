import React from 'react';
import { Layout as AntLayout } from 'antd';
import SideMenu from 'App/layout/SideMenu';
import TopHeader from 'App/layout/TopHeader';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const { Sider, Content } = AntLayout;

interface Props {
  children: React.ReactNode;
  hideHeader?: boolean;
}

function Layout(props: Props) {
  const { hideHeader } = props;
  const isPlayer = /\/(session|assist|view-spot)\//.test(window.location.pathname);
  const { settingsStore, projectsStore } = useStore();
  const siteId = projectsStore.siteId;

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {!hideHeader && (
        <TopHeader />
      )}
      <AntLayout>
        {!hideHeader && !window.location.pathname.includes('/onboarding/') ? (
          <Sider
            style={{
              position: 'sticky',
              top: 70, // Height of the Header
              // backgroundColor: '#f6f6f6',
              height: 'calc(100vh - 70px)', // Adjust the height to accommodate the Header
              overflow: 'auto' // Enable scrolling for the Sider content if needed
            }}
            collapsed={settingsStore.menuCollapsed}
            width={250}
          >
            <SideMenu siteId={siteId!} isCollapsed={settingsStore.menuCollapsed} />
          </Sider>
        ) : null}
        <Content style={{ padding: isPlayer ? '0' : '20px', minHeight: 'calc(100vh - 60px)' }}>
          {props.children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default observer(Layout);
