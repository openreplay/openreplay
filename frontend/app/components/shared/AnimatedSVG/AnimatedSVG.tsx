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
    [ICONS.NO_RESULTS]: require('../../../svg/no-results.svg').default,
    [ICONS.LOADER]: require('../../../svg/openreplay-preloader.svg').default,
    [ICONS.SIGNAL_GREEN]: require('../../../svg/signal-green.svg').default,
    [ICONS.SIGNAL_RED]: require('../../../svg/signal-red.svg').default,
    [ICONS.NO_BOOKMARKS]: require('../../../svg/ca-no-bookmarked-session.svg').default,
    [ICONS.NO_LIVE_SESSIONS]: require('../../../svg/ca-no-live-sessions.svg').default,
    [ICONS.NO_SESSIONS]: require('../../../svg/ca-no-sessions.svg').default,
    [ICONS.NO_SESSIONS_IN_VAULT]: require('../../../svg/ca-no-sessions-in-vault.svg').default,
    [ICONS.NO_WEBHOOKS]: require('../../../svg/ca-no-webhooks.svg').default,
    [ICONS.NO_METADATA]: require('../../../svg/ca-no-metadata.svg').default,
    [ICONS.NO_ISSUES]: require('../../../svg/ca-no-issues.svg').default,
    [ICONS.NO_AUDIT_TRAIL]: require('../../../svg/ca-no-audit-trail.svg').default,
    [ICONS.NO_ANNOUNCEMENTS]: require('../../../svg/ca-no-announcements.svg').default,
    [ICONS.NO_ALERTS]: require('../../../svg/ca-no-alerts.svg').default,
    [ICONS.NO_NOTES]: require('../../../svg/ca-no-notes.svg').default,
    [ICONS.NO_CARDS]: require('../../../svg/ca-no-cards.svg').default,
    [ICONS.NO_RECORDINGS]: require('../../../svg/ca-no-recordings.svg').default,
    [ICONS.NO_SEARCH_RESULTS]: require('../../../svg/ca-no-search-results.svg').default,
    [ICONS.NO_DASHBOARDS]: require('../../../svg/ca-no-dashboards.svg').default,
    [ICONS.NO_PROJECTS]: require('../../../svg/ca-no-projects.svg').default,
    [ICONS.NO_FFLAGS]: require('../../../svg/no-fflags.svg').default,
    [ICONS.PROCESSING]: require('../../../svg/ca-processing.svg').default,
    [ICONS.NO_UXT]: require('../../../svg/empty-uxt-list.svg').default,
};

interface Props {
    name: string;
    size?: number;
}

function AnimatedSVG(props: Props): JSX.Element | null {
    const {name, size = 24} = props;

    // @ts-ignore
    const SvgIcon = ICONS_SVGS[name];

    if (!SvgIcon) {
        return null;
    }

    return <img src={SvgIcon} style={{width: size + 'px'}} alt={name}/>;
}

export default AnimatedSVG;