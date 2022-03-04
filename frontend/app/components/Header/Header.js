import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { NavLink, withRouter } from 'react-router-dom';
import cn from 'classnames';
import { 
  sessions,
  assist,
  client,
  errors,
  dashboard,
  withSiteId,
  CLIENT_DEFAULT_TAB,
  isRoute,
} from 'App/routes';
import { logout } from 'Duck/user';
import { Icon, Popup } from 'UI';
import SiteDropdown from './SiteDropdown';
import styles from './header.css';
import Discover from './Discover/Discover';
import OnboardingExplore from './OnboardingExplore/OnboardingExplore'
import Announcements from '../Announcements';
import Notifications from '../Alerts/Notifications';
import { init as initSite, fetchList as fetchSiteList } from 'Duck/site';

import ErrorGenPanel from 'App/dev/components';
import ErrorsBadge from 'Shared/ErrorsBadge';
import Alerts from '../Alerts/Alerts';

const DASHBOARD_PATH = dashboard();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();
const ERRORS_PATH = errors();
const CLIENT_PATH = client(CLIENT_DEFAULT_TAB);
const AUTOREFRESH_INTERVAL = 30 * 1000;

let interval = null;

const Header = (props) => {
  const { 
    sites, location, account, 
    onLogoutClick, siteId,
    boardingCompletion = 100, fetchSiteList, showAlerts = false
  } = props;
  
  const name = account.get('name').split(" ")[0];
  const [hideDiscover, setHideDiscover] = useState(false)
  let activeSite = null;

  useEffect(() => {
    activeSite = sites.find(s => s.id == siteId);
    props.initSite(activeSite);
  }, [sites])
  
  const showTrackingModal = (
    isRoute(SESSIONS_PATH, location.pathname) ||     
    isRoute(ERRORS_PATH, location.pathname)
  ) && activeSite && !activeSite.recorded;

  useEffect(() => {
    if(showTrackingModal) {
      interval = setInterval(() => {
        fetchSiteList()
      }, AUTOREFRESH_INTERVAL);
    } else if (interval){
      clearInterval(interval);
    }
  }, [showTrackingModal])

  return (
    <div className={ cn(styles.header, showTrackingModal ? styles.placeOnTop : '') }>
      <NavLink to={ withSiteId(SESSIONS_PATH, siteId) }>
        <div className="relative">
          <div className={ styles.logo } />
          <div className="absolute bottom-0" style={{ fontSize: '7px', right: '5px' }}>v{window.ENV.VERSION}</div>
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
        to={ withSiteId(ERRORS_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
      >
        <ErrorsBadge />
        { 'Errors' }
      </NavLink>
      <NavLink
        to={ withSiteId(DASHBOARD_PATH, siteId) }
        className={ styles.nav }
        activeClassName={ styles.active }
      >         
        <span>{ 'Metrics' }</span>
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
        <Popup
          trigger={
            <NavLink to={ CLIENT_PATH } className={ styles.headerIcon }><Icon name="cog" size="20" /></NavLink>
          }
          content={ `Preferences` }
          size="tiny"
          inverted
          position="top center"
        />
        
        <div className={ styles.divider } />
        <div className={ styles.userDetails }>
          <div className="flex items-center">
            <div className="mr-5">{ name }</div>
            <Icon color="gray-medium" name="ellipsis-v" size="24" />
          </div>

          <ul>
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
    appearance: state.getIn([ 'user', 'account', 'appearance' ]),
    siteId: state.getIn([ 'user', 'siteId' ]),
    sites: state.getIn([ 'site', 'list' ]),
    showAlerts: state.getIn([ 'dashboard', 'showAlerts' ]),
    boardingCompletion: state.getIn([ 'dashboard', 'boardingCompletion' ])
  }),
  { onLogoutClick: logout, initSite, fetchSiteList },
)(Header));
