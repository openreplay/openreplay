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
  withSiteId,
  CLIENT_DEFAULT_TAB,
} from 'App/routes';
import { logout } from 'Duck/user';
import { Icon, Popup } from 'UI';
import SiteDropdown from './SiteDropdown';
import styles from './header.module.css';
import OnboardingExplore from './OnboardingExplore/OnboardingExplore'
import Announcements from '../Announcements';
import Notifications from '../Alerts/Notifications';
import { init as initSite } from 'Duck/site';

import ErrorGenPanel from 'App/dev/components';
import Alerts from '../Alerts/Alerts';
import AnimatedSVG, { ICONS } from '../shared/AnimatedSVG/AnimatedSVG';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const DASHBOARD_PATH = dashboard();
const METRICS_PATH = metrics();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();
const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);

const Header = (props) => {
  const { 
    sites, location, account, 
    onLogoutClick, siteId,
    boardingCompletion = 100, showAlerts = false,
  } = props;
  
  const name = account.get('name').split(" ")[0];
  const [hideDiscover, setHideDiscover] = useState(false)
  const { userStore, notificationStore } = useStore();
  const initialDataFetched = useObserver(() => userStore.initialDataFetched);
  let activeSite = null;

  const onAccountClick = () => {
    props.history.push(CLIENT_PATH);
  }

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
    activeSite = sites.find(s => s.id == siteId);
    props.initSite(activeSite);
  }, [siteId])

  return (
    <div className={ cn(styles.header) } style={{ height: '50px'}}>
      <NavLink to={ withSiteId(SESSIONS_PATH, siteId) }>
        <div className="relative select-none">
          <div className="px-4 py-2">
            <AnimatedSVG name={ICONS.LOGO_SMALL} size="30" />
          </div>
          <div className="absolute bottom-0" style={{ fontSize: '7px', right: '5px' }}>v{window.env.VERSION}</div>
        </div>
      </NavLink>
      <SiteDropdown />
      <div className={ styles.divider } />

      <NavLink
        to={ withSiteId(SESSIONS_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
      >
        { 'Sessions' }
      </NavLink>
      <NavLink
        to={ withSiteId(ASSIST_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
      >
        { 'Assist' }
      </NavLink>
      <NavLink
        to={ withSiteId(DASHBOARD_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
        isActive={ (_, location) => {
          return location.pathname.includes(DASHBOARD_PATH) || location.pathname.includes(METRICS_PATH);
        }}
      >         
        <span>{ 'Dashboards' }</span>
      </NavLink>
      <div className={ styles.right }>
        <Announcements />
        <div className={ styles.divider } />

        { (boardingCompletion < 100 && !hideDiscover) && (
          <React.Fragment>            
            <OnboardingExplore onComplete={() => setHideDiscover(true)} />
            <div className={ styles.divider } />
          </React.Fragment>
        )}
      
        <Notifications />
        <div className={ styles.divider } />
        <Popup content={ `Preferences` } >
          <NavLink to={ CLIENT_PATH } className={ styles.headerIcon }><Icon name="cog" size="20" /></NavLink>
        </Popup>
        
        <div className={ styles.divider } />
        <div className={ styles.userDetails }>
          <div className="flex items-center">
            <div className="mr-5">{ name }</div>
            <Icon color="gray-medium" name="ellipsis-v" size="24" />
          </div>

          <ul>
            <li><button onClick={ onAccountClick }>{ 'Account' }</button></li>
            <li><button onClick={ onLogoutClick }>{ 'Logout' }</button></li>
          </ul>
        </div>
      </div>
      { <ErrorGenPanel/> }
      {showAlerts && <Alerts />}
    </div>
  );
};

export default withRouter(connect(
  state => ({
    account: state.getIn([ 'user', 'account' ]),
    siteId: state.getIn([ 'site', 'siteId' ]),
    sites: state.getIn([ 'site', 'list' ]),
    showAlerts: state.getIn([ 'dashboard', 'showAlerts' ]),
    boardingCompletion: state.getIn([ 'dashboard', 'boardingCompletion' ])
  }),
  { onLogoutClick: logout, initSite, fetchMetadata },
)(Header));
