import React from 'react';
import { Layout as AntLayout } from 'antd';
import SideMenu from 'App/layout/SideMenu';
import TopHeader from 'App/layout/TopHeader';

const { Header, Sider, Content } = AntLayout;

interface Props {
  children: React.ReactNode;
  hideHeader?: boolean;
  siteId?: string;
}

function Layout(props: Props) {
  const { hideHeader, siteId } = props;
  const isPlayer = /\/(session|assist)\//.test(window.location.pathname);
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {!hideHeader && (
        <TopHeader />
      )}
      <AntLayout>
        {!hideHeader && (
          <Sider
            style={{
              position: 'sticky',
              top: 60, // Height of the Header
              backgroundColor: '#f6f6f6',
              height: 'calc(100vh - 80px)', // Adjust the height to accommodate the Header
              overflow: 'auto' // Enable scrolling for the Sider content if needed
            }}
            width={250}
          >
            <SideMenu siteId={siteId} />
          </Sider>
        )}
        <Content style={{ padding: isPlayer ? '0' : '20px', minHeight: 'calc(100vh - 50px)' }}>
          {props.children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default Layout;
