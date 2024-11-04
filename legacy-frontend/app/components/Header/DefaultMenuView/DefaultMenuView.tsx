import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  sessions,
  metrics,
  assist,
  dashboard,
  withSiteId,
  recordings,
} from 'App/routes';
import SiteDropdown from '../SiteDropdown';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import styles from '../header.module.css';

const DASHBOARD_PATH = dashboard();
const METRICS_PATH = metrics();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();
const RECORDINGS_PATH = recordings();

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

      <NavLink
        to={withSiteId(SESSIONS_PATH, siteId)}
        className={styles.nav}
        activeClassName={styles.active}
        data-test-id={"sessions"}
      >
        Sessions
      </NavLink>
      <NavLink
        to={withSiteId(ASSIST_PATH, siteId)}
        className={styles.nav}
        activeClassName={styles.active}
        isActive={(_, location) => {
          return (
            location.pathname.includes(ASSIST_PATH) || location.pathname.includes(RECORDINGS_PATH)
          );
        }}
        data-test-id={"assist"}
      >
        Assist
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
        data-test-id={"dashboards"}
      >
        Dashboards
      </NavLink>
    </div>
  );
}

export default DefaultMenuView;
