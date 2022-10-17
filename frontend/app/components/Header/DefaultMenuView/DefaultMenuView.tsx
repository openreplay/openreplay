import React from 'react';
import { NavLink, withRouter } from 'react-router-dom';
import {
  sessions,
  metrics,
  assist,
  client,
  dashboard,
  withSiteId,
  CLIENT_DEFAULT_TAB,
} from 'App/routes';
import SiteDropdown from '../SiteDropdown';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import styles from '../header.module.css';

const DASHBOARD_PATH = dashboard();
const METRICS_PATH = metrics();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();

interface Props {
  siteId: any;
}
function DefaultMenuView(props: Props) {
  const { siteId } = props;
  return (
    <div className="flex items-center">
      <NavLink to={withSiteId(SESSIONS_PATH, props.siteId)}>
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
        to={withSiteId(DASHBOARD_PATH, siteId)}
        className={styles.nav}
        activeClassName={styles.active}
        isActive={(_, location) => {
          return (
            location.pathname.includes(DASHBOARD_PATH) || location.pathname.includes(METRICS_PATH)
          );
        }}
      >
        <span>{'Dashboards'}</span>
      </NavLink>
    </div>
  );
}

export default DefaultMenuView;
