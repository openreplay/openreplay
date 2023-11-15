import React from 'react';
import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';
import Notifications from 'Components/Alerts/Notifications/Notifications';
import HealthStatus from 'Components/Header/HealthStatus';
import { getInitials } from 'App/utils';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import { connect } from 'react-redux';
import { Popover, Space } from 'antd';
import ProjectDropdown from 'Shared/ProjectDropdown';

interface Props {
  account: any;
  siteId: any;
  sites: any;
  boardingCompletion: any;
}

function TopRight(props: Props) {
  const { account } = props;
  // @ts-ignore
  return (
    <Space style={{ lineHeight: '0'}}>
      <ProjectDropdown />
      <GettingStartedProgress />

      <Notifications />

      {account.name ? <HealthStatus /> : null}

      <Popover content={<UserMenu />} placement={'topRight'}>
        <div className='flex items-center cursor-pointer'>
          <div className='bg-tealx rounded-full flex items-center justify-center color-white' style={{ width: '32px', height: '32px'}}>
            {getInitials(account.name)}
          </div>
        </div>
      </Popover>
    </Space>
  );
}

function mapStateToProps(state: any) {
  return {
    account: state.getIn(['user', 'account']),
    siteId: state.getIn(['site', 'siteId']),
    sites: state.getIn(['site', 'list']),
    boardingCompletion: state.getIn(['dashboard', 'boardingCompletion'])
  };
}

export default connect(mapStateToProps)(TopRight);