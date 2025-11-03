import React, { useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import SideMenu from 'App/layout/SideMenu';
import TopHeader from 'App/layout/TopHeader';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { mobileScreen } from 'App/utils/isMobile';

const { Sider, Content } = AntLayout;

interface Props {
  children: React.ReactNode;
  hideHeader?: boolean;
}

function Layout(props: Props) {
  const { hideHeader } = props;
  const isPlayer = /\/(session|assist|view-spot)\//.test(
    window.location.pathname,
  );
  const { settingsStore, projectsStore } = useStore();
  const [collapsed, setCollapsed] = React.useState(false);
  const { siteId } = projectsStore;
  const mobileDevice = mobileScreen

  useEffect(() => {
    const handleResize = () => {
      if (mobileDevice) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <AntLayout style={{ height: '100dvh' }}>
      {!hideHeader && <TopHeader />}
      <AntLayout>
        {!hideHeader && !window.location.pathname.includes('/onboarding/') ? (
          mobileDevice ? (
            <SideMenu
              siteId={siteId!}
              isCollapsed={settingsStore.menuCollapsed || collapsed}
            />
          ) : (
            <Sider
              style={{
                position: 'sticky',
                top: 60,
                alignSelf: 'flex-start',
              }}
              collapsed={settingsStore.menuCollapsed || collapsed}
              width={250}
            >
              <SideMenu
                siteId={siteId!}
                isCollapsed={settingsStore.menuCollapsed || collapsed}
              />
            </Sider>
          )
        ) : null}
        <Content
          style={{
            padding: isPlayer
              ? '0'
              : mobileDevice
                ? '8px 8px 60px 8px'
                : '20px',
            minHeight: 'calc(100dvh - 60px)',
          }}
        >
          {props.children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default observer(Layout);
