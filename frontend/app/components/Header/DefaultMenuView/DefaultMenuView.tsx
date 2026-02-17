import React from 'react';
import { NavLink, useLocation } from 'App/routing';
import {
  sessions,
  metrics,
  assist,
  dashboard,
  withSiteId,
  recordings,
} from 'App/routes';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import SiteDropdown from '../SiteDropdown';
import styles from '../header.module.css';
import { useTranslation } from 'react-i18next';
import Survey from 'App/components/Survey';
import Version from './Version';

const DASHBOARD_PATH = dashboard();
const METRICS_PATH = metrics();
const SESSIONS_PATH = sessions();
const ASSIST_PATH = assist();
const RECORDINGS_PATH = recordings();

interface Props {
  siteId: any;
}
function DefaultMenuView(props: Props) {
  const { t } = useTranslation();
  const { siteId } = props;
  const location = useLocation();
  const isAssistActive =
    location.pathname.includes(ASSIST_PATH) ||
    location.pathname.includes(RECORDINGS_PATH);
  const isDashboardsActive =
    location.pathname.includes(DASHBOARD_PATH) ||
    location.pathname.includes(METRICS_PATH);
  return (
    <div className="flex items-center">
      <Survey />
      <NavLink to={withSiteId(SESSIONS_PATH, props.siteId)}>
        <div className="relative select-none">
          <div className="px-4 py-2">
            <AnimatedSVG name={ICONS.LOGO_SMALL} size="30" />
          </div>
          <Version />
        </div>
      </NavLink>
      <SiteDropdown />

      <NavLink
        to={withSiteId(SESSIONS_PATH, siteId)}
        className={({ isActive }) =>
          `${styles.nav} ${isActive ? styles.active : ''}`
        }
        data-test-id="sessions"
      >
        {t('Sessions')}
      </NavLink>
      <NavLink
        to={withSiteId(ASSIST_PATH, siteId)}
        className={({ isActive }) =>
          `${styles.nav} ${isActive || isAssistActive ? styles.active : ''}`
        }
        data-test-id="assist"
      >
        {t('Assist')}
      </NavLink>
      <NavLink
        to={withSiteId(DASHBOARD_PATH, siteId)}
        className={({ isActive }) =>
          `${styles.nav} ${isActive || isDashboardsActive ? styles.active : ''}`
        }
        data-test-id="dashboards"
      >
        {t('Dashboards')}
      </NavLink>
    </div>
  );
}

export default DefaultMenuView;
