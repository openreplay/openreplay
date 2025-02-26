import { Popover, Space } from 'antd';
import React from 'react';
import { getInitials } from 'App/utils';
import Notifications from 'Components/Alerts/Notifications/Notifications';
import HealthStatus from 'Components/Header/HealthStatus';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import LanguageSwitcher from 'Components/LanguageSwitcher/LanguageSwitcher';

import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';
import ProjectDropdown from 'Shared/ProjectDropdown';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  account: any;
  spotOnly?: boolean;
}

function TopRight(props: Props) {
  const { userStore } = useStore();
  const spotOnly = userStore.scopeState === 1;
  const { account } = userStore;
  return (
    <Space style={{ lineHeight: '0' }}>
      {props.spotOnly ? null : (
        <>
          <ProjectDropdown />
          <GettingStartedProgress />

          <Notifications />

          {account.name ? <HealthStatus /> : null}
          <LanguageSwitcher />
        </>
      )}

      <Popover content={<UserMenu />} placement="topRight">
        <div className="flex items-center cursor-pointer">
          <div
            className="bg-tealx rounded-full flex items-center justify-center color-white"
            style={{ width: '32px', height: '32px' }}
          >
            {getInitials(account.name)}
          </div>
        </div>
      </Popover>
    </Space>
  );
}

export default observer(TopRight);
