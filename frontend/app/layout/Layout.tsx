import React, { useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import SideMenu from 'App/layout/SideMenu';
import TopHeader from 'App/layout/TopHeader';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { init as initSite } from 'Duck/site';
import { connect } from 'react-redux';


const { Header, Sider, Content } = AntLayout;

interface Props {
  children: React.ReactNode;
  hideHeader?: boolean;
  siteId?: string;
  fetchMetadata: (siteId: string) => void;
  initSite: (site: any) => void;
  sites: any[];
}

function Layout(props: Props) {
  const { hideHeader, siteId } = props;
  const isPlayer = /\/(session|assist)\//.test(window.location.pathname);
  const { settingsStore } = useStore();

  // const lastFetchedSiteIdRef = React.useRef<string | null>(null);
  //
  // useEffect(() => {
  //   if (!siteId || siteId === lastFetchedSiteIdRef.current) return;
  //
  //   const activeSite = props.sites.find((s) => s.id == siteId);
  //   props.initSite(activeSite);
  //   props.fetchMetadata(siteId);
  //
  //   lastFetchedSiteIdRef.current = siteId;
  // }, [siteId]);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {!hideHeader && (
        <TopHeader />
      )}
      <AntLayout>
        {!hideHeader && !window.location.pathname.includes('/onboarding/') && (
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
            <SideMenu siteId={siteId} isCollapsed={settingsStore.menuCollapsed} />
          </Sider>
        )}
        <Content style={{ padding: isPlayer ? '0' : '20px', minHeight: 'calc(100vh - 60px)' }}>
          {props.children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default connect((state: any) => ({
  siteId: state.getIn(['site', 'siteId']),
  sites: state.getIn(['site', 'list'])
}), { fetchMetadata, initSite })(observer(Layout));
