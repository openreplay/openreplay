import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { NavLink, withRouter } from 'react-router-dom';
import cn from 'classnames';
import {
  sessions,
  metrics,
  assist,
  client,
  dashboard,
  alerts,
  withSiteId,
  CLIENT_DEFAULT_TAB,
} from 'App/routes';
import { logout } from 'Duck/user';
import { Icon, Popup } from 'UI';
import SiteDropdown from './SiteDropdown';
import styles from './header.module.css';
import OnboardingExplore from './OnboardingExplore/OnboardingExplore';
import Announcements from '../Announcements';
import Notifications from '../Alerts/Notifications';
import { init as initSite } from 'Duck/site';
import { getInitials } from 'App/utils';

import ErrorGenPanel from 'App/dev/components';
import Alerts from '../Alerts/Alerts';
import AnimatedSVG, { ICONS } from '../shared/AnimatedSVG/AnimatedSVG';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import UserMenu from './UserMenu';

const DASHBOARD_PATH = dashboard();
const ALERTS_PATH = alerts();
const METRICS_PATH = metrics();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();
const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

const Header = (props) => {
  const {
    sites,
    location,
    account,
    onLogoutClick,
    siteId,
    boardingCompletion = 100,
    showAlerts = false,
  } = props;

  const name = account.get('name').split(' ')[0];
  const [hideDiscover, setHideDiscover] = useState(false);
  const { userStore, notificationStore } = useStore();
  const initialDataFetched = useObserver(() => userStore.initialDataFetched);
  let activeSite = null;

  const onAccountClick = () => {
    props.history.push(CLIENT_PATH);
  };

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
    <div className={cn(styles.header)} style={{ height: '50px' }}>
      <NavLink to={withSiteId(SESSIONS_PATH, siteId)}>
        <div className="relative select-none">
          <div className="px-4 py-2">
            <AnimatedSVG name={ICONS.LOGO_SMALL} size="30" />
          </div>
          <div className="absolute bottom-0" style={{ fontSize: '7px', right: '5px' }}>
            v{window.env.VERSION}
          </div>
        </div>
      </NavLink>
      <SiteDropdown />
      {/* <div className={ styles.divider } /> */}

      <NavLink
        to={withSiteId(SESSIONS_PATH, siteId)}
        className={styles.nav}
        activeClassName={styles.active}
      >
        {'Sessions'}
      </NavLink>
      <NavLink
        to={withSiteId(ASSIST_PATH, siteId)}
        className={styles.nav}
        activeClassName={styles.active}
      >
        {'Assist'}
      </NavLink>
      <NavLink
        to={ withSiteId(DASHBOARD_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
        isActive={ (_, location) => {
          return location.pathname.includes(DASHBOARD_PATH)
          || location.pathname.includes(METRICS_PATH)
          || location.pathname.includes(ALERTS_PATH)
        }}
      >
        <span>{'Dashboards'}</span>
      </NavLink>
      <div className={styles.right}>
        {/* <Announcements /> */}
        {/* <div className={ styles.divider } /> */}

        {boardingCompletion < 100 && !hideDiscover && (
          <React.Fragment>
            <OnboardingExplore onComplete={() => setHideDiscover(true)} />
          </React.Fragment>
        )}

        <Notifications />
        <Popup content={`Preferences`}>
          <NavLink to={CLIENT_PATH} className={styles.headerIcon}>
            <Icon name="gear-fill" size="20" />
          </NavLink>
        </Popup>

        <div className={cn(styles.userDetails, 'group cursor-pointer')}>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-tealx rounded-full flex items-center justify-center color-white">
              {getInitials(name)}
            </div>
          </div>

          <UserMenu className="invisible group-hover:visible" />
        </div>
      </div>
      {<ErrorGenPanel />}
      {showAlerts && <Alerts />}
    </div>
  );
};

export default withRouter(
  connect(
    (state) => ({
      account: state.getIn(['user', 'account']),
      siteId: state.getIn(['site', 'siteId']),
      sites: state.getIn(['site', 'list']),
      showAlerts: state.getIn(['dashboard', 'showAlerts']),
      boardingCompletion: state.getIn(['dashboard', 'boardingCompletion']),
    }),
    { onLogoutClick: logout, initSite, fetchMetadata }
  )(Header)
);
