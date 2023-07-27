import React from 'react';
import Header from 'Components/Header/Header';
import { Menu, MenuProps } from 'antd';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { client, CLIENT_DEFAULT_TAB, withSiteId } from 'App/routes';
import { NavLink } from 'react-router-dom';
import Logo from 'App/layout/Logo';
import SiteDropdown from 'Components/Header/SiteDropdown';
import styles from 'Components/Header/header.module.css';
import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';
import Notifications from 'Components/Alerts/Notifications/Notifications';
import cn from 'classnames';
import { Icon, Tooltip } from 'UI';
import SettingsMenu from 'Components/Header/SettingsMenu/SettingsMenu';
import HealthStatus from 'Components/Header/HealthStatus';
import { getInitials } from 'App/utils';
import UserMenu from 'Components/Header/UserMenu/UserMenu';
import ErrorGenPanel from 'App/dev/components/ErrorGenPanel';
import TopRight from 'App/layout/TopRight';

interface Props {

}

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);


const items1: MenuProps['items'] = ['1', '2', '3'].map((key) => ({
  key,
  label: `nav ${key}`
}));


function TopHeader(props: Props) {
  // @ts-ignore
  return (
    <>
      <div className='flex items-center'>
        <Logo siteId={1} />
        <div className='mx-4' />
        <SiteDropdown />
      </div>

      <TopRight />
    </>
  );
}

export default TopHeader;