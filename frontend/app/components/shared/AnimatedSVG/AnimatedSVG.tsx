import React from 'react';

export enum ICONS {
  DASHBOARD_ICON = 'dashboard-icn',
  EMPTY_STATE = 'empty-state',
  LOGO_SMALL = 'logo-small',
  LOGO_FULL = 'logo-full',
  NO_RESULTS = 'no-results',
  LOADER = 'openreplay-preloader',
  SIGNAL_GREEN = 'signal-green',
  SIGNAL_RED = 'signal-red',
  NO_BOOKMARKS = 'ca-no-bookmarked-session',
  NO_LIVE_SESSIONS = 'ca-no-live-sessions',
  NO_SESSIONS = 'ca-no-sessions',
  NO_SESSIONS_IN_VAULT = 'ca-no-sessions-in-vault',
  NO_WEBHOOKS = 'ca-no-webhooks',
  NO_METADATA = 'ca-no-metadata',
  NO_ISSUES = 'ca-no-issues',
  NO_AUDIT_TRAIL = 'ca-no-audit-trail',
  NO_ANNOUNCEMENTS = 'ca-no-announcements',
  NO_ALERTS = 'ca-no-alerts',
  NO_NOTES = 'ca-no-notes',
  NO_CARDS = 'ca-no-cards',
  NO_RECORDINGS = 'ca-no-recordings',
  NO_SEARCH_RESULTS = 'ca-no-search-results',
  NO_DASHBOARDS = 'ca-no-dashboards',
  NO_PROJECTS = 'ca-no-projects',
  NO_FFLAGS = 'no-fflags',
  PROCESSING = 'ca-processing',
  NO_UXT = 'ca-no-uxt',
}

const ICONS_SVGS = {
  [ICONS.DASHBOARD_ICON]: require('../../../svg/dashboard-icn.svg').default,
  [ICONS.EMPTY_STATE]: require('../../../svg/empty-state.svg').default,
  [ICONS.LOGO_SMALL]: require('../../../svg/logo-small.svg').default,
  [ICONS.LOGO_FULL]: require('../../../svg/logo.svg').default,
  [ICONS.NO_RESULTS]: require('../../../svg/ghost.svg').default,
  [ICONS.LOADER]: require('../../../svg/openreplay-preloader.svg').default,
  [ICONS.SIGNAL_GREEN]: require('../../../svg/signal-green.svg').default,
  [ICONS.SIGNAL_RED]: require('../../../svg/signal-red.svg').default,
  [ICONS.NO_BOOKMARKS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_LIVE_SESSIONS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_SESSIONS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_SESSIONS_IN_VAULT]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_WEBHOOKS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_METADATA]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_ISSUES]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_AUDIT_TRAIL]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_ANNOUNCEMENTS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_ALERTS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_NOTES]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_CARDS]: require('../../../svg/ca-no-cards.svg').default,
  [ICONS.NO_RECORDINGS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_SEARCH_RESULTS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_DASHBOARDS]: require('../../../svg/ca-no-dashboards.svg').default,
  [ICONS.NO_PROJECTS]: require('../../../svg/ghost.svg').default,
  [ICONS.NO_FFLAGS]: require('../../../svg/ghost.svg').default,
  [ICONS.PROCESSING]: require('../../../svg/ca-processing.svg').default,
  [ICONS.NO_UXT]: require('../../../svg/empty-uxt-list.svg').default,
};

interface Props {
  name: string;
  size?: number;
  disableSize?: boolean;
  className?: string;
}

function AnimatedSVG(props: Props): JSX.Element | null {
  const { name, size = 24, disableSize, className } = props;

  // @ts-ignore
  const SvgIcon = ICONS_SVGS[name];

  if (!SvgIcon) {
    return null;
  }
  const style = disableSize ? {} : { width: `${size}px` };
  return <img src={SvgIcon} style={style} className={className} alt={name} />;
}

export default AnimatedSVG;
