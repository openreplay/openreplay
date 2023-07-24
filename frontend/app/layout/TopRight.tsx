import React from 'react';
import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';
import Notifications from 'Components/Alerts/Notifications/Notifications';
import cn from 'classnames';
import styles from 'Components/Header/header.module.css';
import { Icon, Tooltip } from 'UI';
import { NavLink } from 'react-router-dom';
import SettingsMenu from 'Components/Header/SettingsMenu/SettingsMenu';
import HealthStatus from 'Components/Header/HealthStatus';
import { getInitials } from 'App/utils';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import ErrorGenPanel from 'App/dev/components/ErrorGenPanel';
import { client, CLIENT_DEFAULT_TAB } from 'App/routes';
import { connect } from 'react-redux';
import { Menu, MenuProps, Popover, Button } from 'antd';

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

const items: MenuProps['items'] = [
  { key: '1', label: 'nav 1' },
  { key: '2', label: 'nav 2' }
];

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
    // <Menu mode='horizontal' defaultSelectedKeys={['2']} items={items}
    //       style={{ height: '50px' }}
    //       className='bg-gray-lightest' />
    <div className='flex items-center'>
      <GettingStartedProgress />

      <Notifications />

      <div className='mx-2' />

      <Popover content={<SettingsMenu account={account} />}>
        {/*<Button type='primary'>Hover me</Button>*/}
        <NavLink to={CLIENT_PATH}>
          <Icon name='gear' size='20' color='gray-dark' className='cursor-pointer' />
        </NavLink>
      </Popover>

      <div className='mx-2' />

      <HealthStatus />

      <div className='mx-2' />

      <Popover content={<UserMenu className='' />}>
        <div className='flex items-center cursor-pointer'>
          <div className='w-10 h-10 bg-tealx rounded-full flex items-center justify-center color-white'>
            {getInitials(account.name)}
          </div>
        </div>
      </Popover>

      <ErrorGenPanel />
    </div>
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