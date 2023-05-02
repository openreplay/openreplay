import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { NavLink, withRouter } from 'react-router-dom';
import cn from 'classnames';
import { client, CLIENT_DEFAULT_TAB } from 'App/routes';
import { logout } from 'Duck/user';
import { Icon, Tooltip } from 'UI';
import styles from './header.module.css';
import OnboardingExplore from './OnboardingExplore/OnboardingExplore';
import Notifications from '../Alerts/Notifications';
import { init as initSite } from 'Duck/site';
import { getInitials } from 'App/utils';

import ErrorGenPanel from 'App/dev/components';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserMenu from './UserMenu';
import SettingsMenu from './SettingsMenu';
import DefaultMenuView from './DefaultMenuView';
import PreferencesView from './PreferencesView';
import HealthStatus from './HealthStatus'
import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';

const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

const Header = (props) => {
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
        notificationStore.fetchNotificationsCount(),
        props.fetchMetadata(),
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
    <div
      className={cn(styles.header, 'fixed w-full bg-white flex justify-between')}
      style={{ height: '50px' }}
    >
      {!isPreferences && <DefaultMenuView siteId={siteId} />}
      {isPreferences && <PreferencesView />}
      <div className={styles.right}>
        <GettingStartedProgress />

        <Notifications />
        <div className={cn(styles.userDetails, 'group cursor-pointer')}>
          <Tooltip title={`Preferences`} disabled>
            <div className="flex items-center">
              <NavLink to={CLIENT_PATH}>
                <Icon name="gear" size="20" color="gray-dark" />
              </NavLink>

              <SettingsMenu className="invisible group-hover:visible" account={account} />
            </div>
          </Tooltip>
        </div>

        <HealthStatus />

        <div className={cn(styles.userDetails, 'group cursor-pointer')}>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center color-white">
              {getInitials(name)}
            </div>
          </div>

          <UserMenu className="invisible group-hover:visible" />
        </div>

        {<ErrorGenPanel />}
      </div>
    </div>
  );
};

export default withRouter(
  connect(
    (state) => ({
      account: state.getIn(['user', 'account']),
      siteId: state.getIn(['site', 'siteId']),
      sites: state.getIn(['site', 'list']),
      boardingCompletion: state.getIn(['dashboard', 'boardingCompletion']),
    }),
    { onLogoutClick: logout, initSite, fetchMetadata }
  )(Header)
);
