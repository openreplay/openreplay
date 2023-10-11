import React from 'react';
import Logo from 'App/layout/Logo';
import TopRight from 'App/layout/TopRight';
import ProjectDropdown from 'Shared/ProjectDropdown';
import { Layout, Space } from 'antd';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { observer } from 'mobx-react-lite';

const { Header } = Layout;

function TopHeader() {
  const { settingsStore } = useStore();

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
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
          <Logo siteId={1} />
        </div>
      </Space>

      <TopRight />
    </Header>
  );
}

export default observer(TopHeader);