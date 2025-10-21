import { Popover, Space } from 'antd';
import React from 'react';
import { getInitials } from 'App/utils';
import Notifications from 'Components/Alerts/Notifications/Notifications';
import HealthStatus from 'Components/Header/HealthStatus';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import SaasHeaderMenuItems from 'Components/Header/SaasHeaderMenuItems/SaasHeaderMenuItems';
import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';
import ProjectDropdown from 'Shared/ProjectDropdown';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ThemeToggle from 'Components/ThemeToggle';
import { hasHealth } from '@/utils/split-utils';
import { mobileScreen } from 'App/utils/isMobile';

function TopRight() {
  const { userStore } = useStore();
  const { account } = userStore;

  const mobile = mobileScreen;
  return (
    <Space style={{ lineHeight: '0' }}>
      <SaasHeaderMenuItems />
      <ProjectDropdown />
      <GettingStartedProgress />

      <Notifications />

      {hasHealth && account.name ? <HealthStatus /> : null}
      {mobile ? null : <ThemeToggle />}

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
