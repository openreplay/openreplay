import React, { useEffect, useState } from 'react';
import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import { Layout, Space } from 'antd';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { observer, useObserver } from 'mobx-react-lite';
import { INDEXES } from 'App/constants/zindex';
import { connect } from 'react-redux';
import { logout } from 'Duck/user';
import { init as initSite } from 'Duck/site';
import { fetchListActive as fetchMetadata } from 'Duck/customField';

const { Header } = Layout;

interface Props {
  sites: any[];
  account: any;
  siteId: string;
  boardingCompletion?: number;
  showAlerts?: boolean;
  fetchMetadata: () => void;
  initSite: (site: any) => void;
}

function TopHeader(props: Props) {
  const { settingsStore } = useStore();

  const { sites, account, siteId, boardingCompletion = 100, showAlerts = false } = props;

  const name = account.get('name');
  const [hideDiscover, setHideDiscover] = useState(false);
  const { userStore, notificationStore } = useStore();
  const initialDataFetched = useObserver(() => userStore.initialDataFetched);
  let activeSite = null;
  const isPreferences = window.location.pathname.includes('/client/');

  useEffect(() => {
    if (!account.id || initialDataFetched) return;

    setTimeout(() => {
      Promise.all([
        userStore.fetchLimits(),
        notificationStore.fetchNotificationsCount()
        // props.fetchMetadata() // TODO check for this
      ]).then(() => {
        userStore.updateKey('initialDataFetched', true);
      });
    }, 0);
  }, [account]);

  useEffect(() => {
    activeSite = sites.find((s) => s.id == siteId);
    props.initSite(activeSite);
  }, [siteId]);

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: INDEXES.HEADER,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        height: '60px'
      }}
      className='justify-between'
    >
      <Space>
        <div
          onClick={() => {
            settingsStore.updateMenuCollapsed(!settingsStore.menuCollapsed);
          }}
          style={{ paddingTop: '4px' }}
          className='cursor-pointer'
        >
          <Icon name={settingsStore.menuCollapsed ? 'side_menu_closed' : 'side_menu_open'} size={20} />
        </div>

        <div className='flex items-center'>
          <Logo siteId={siteId} />
        </div>
      </Space>

      <TopRight />
    </Header>
  );
}

const mapStateToProps = (state: any) => ({
  account: state.getIn(['user', 'account']),
  siteId: state.getIn(['site', 'siteId']),
  sites: state.getIn(['site', 'list']),
  boardingCompletion: state.getIn(['dashboard', 'boardingCompletion'])
});

const mapDispatchToProps = {
  onLogoutClick: logout,
  initSite,
  fetchMetadata
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(observer(TopHeader));
