import React, { useEffect } from 'react';
import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import { Layout, Space, Tooltip } from 'antd';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { INDEXES } from 'App/constants/zindex';
import { connect } from 'react-redux';
import { logout } from 'Duck/user';

const { Header } = Layout;

interface Props {
  account: any;
}

function TopHeader(props: Props) {
  const { settingsStore } = useStore();

  const { account } = props;
  const { userStore, notificationStore, projectsStore } = useStore();
  const siteId = projectsStore.siteId;
  const initialDataFetched = userStore.initialDataFetched;

  useEffect(() => {
    if (!account.id || initialDataFetched) return;
    Promise.all([
      userStore.fetchLimits(),
      notificationStore.fetchNotificationsCount()

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
        height: '60px'
      }}
      className="justify-between"
    >
      <Space>
        <div
          onClick={() => {
            settingsStore.updateMenuCollapsed(!settingsStore.menuCollapsed);
          }}
          style={{ paddingTop: '4px' }}
          className="cursor-pointer"
        >
          <Tooltip title={settingsStore.menuCollapsed ? 'Show Menu' : 'Hide Menu'} mouseEnterDelay={1}>
            <Icon name={settingsStore.menuCollapsed ? 'side_menu_closed' : 'side_menu_open'} size={20} />
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

const mapStateToProps = (state: any) => ({
  account: state.getIn(['user', 'account']),
});

const mapDispatchToProps = {
  onLogoutClick: logout,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(observer(TopHeader));
