import React from 'react';
import { mobileScreen } from 'App/utils/isMobile';
const dashboardIcn = new URL('../../../svg/dashboard-icn.svg', import.meta.url);
const loader = new URL(
  '../../../svg/openreplay-preloader.svg',
  import.meta.url,
);
const emptyState = new URL('../../../svg/empty-state.svg', import.meta.url);
const ghost = new URL('../../../svg/ghost.svg', import.meta.url);
const signalGreen = new URL('../../../svg/signal-green.svg', import.meta.url);
const signalRed = new URL('../../../svg/signal-red.svg', import.meta.url);
const caNoCards = new URL('../../../svg/ca-no-cards.svg', import.meta.url);
const caNoDashboards = new URL(
  '../../../svg/ca-no-dashboards.svg',
  import.meta.url,
);
const caProcessing = new URL('../../../svg/ca-processing.svg', import.meta.url);
const emptyUxtList = new URL(
  '../../../svg/empty-uxt-list.svg',
  import.meta.url,
);
const logoSmall = new URL('../../../svg/logo-small.svg', import.meta.url);
const logoFull = new URL('../../../svg/logo.svg', import.meta.url);

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
  PROCESSING = 'ca-processing',
  NO_UXT = 'ca-no-uxt',
}

const ICONS_SVGS = {
  [ICONS.DASHBOARD_ICON]: dashboardIcn,
  [ICONS.EMPTY_STATE]: emptyState,
  [ICONS.LOGO_SMALL]: logoSmall,
  [ICONS.LOGO_FULL]: logoFull,
  [ICONS.NO_RESULTS]: ghost,
  [ICONS.LOADER]: loader,
  [ICONS.SIGNAL_GREEN]: signalGreen,
  [ICONS.SIGNAL_RED]: signalRed,
  [ICONS.NO_BOOKMARKS]: ghost,
  [ICONS.NO_LIVE_SESSIONS]: ghost,
  [ICONS.NO_SESSIONS]: ghost,
  [ICONS.NO_SESSIONS_IN_VAULT]: ghost,
  [ICONS.NO_WEBHOOKS]: ghost,
  [ICONS.NO_METADATA]: ghost,
  [ICONS.NO_ISSUES]: ghost,
  [ICONS.NO_AUDIT_TRAIL]: ghost,
  [ICONS.NO_ANNOUNCEMENTS]: ghost,
  [ICONS.NO_ALERTS]: ghost,
  [ICONS.NO_NOTES]: ghost,
  [ICONS.NO_CARDS]: caNoCards,
  [ICONS.NO_RECORDINGS]: ghost,
  [ICONS.NO_SEARCH_RESULTS]: ghost,
  [ICONS.NO_DASHBOARDS]: caNoDashboards,
  [ICONS.NO_PROJECTS]: ghost,
  [ICONS.PROCESSING]: caProcessing,
  [ICONS.NO_UXT]: emptyUxtList,
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
  const style = disableSize
    ? {}
    : {
        width: `${size}px`,
        maxWidth: mobileScreen
          ? window.innerWidth - window.innerWidth / 10
          : undefined,
      };
  return <img src={SvgIcon} style={style} className={className} alt={name} />;
}

export default AnimatedSVG;
