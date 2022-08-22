import React from 'react';
import LogoSmall from '../../../svg/logo-small.svg';
import NoResultsSVG from '../../../svg/no-results.svg';
import EmptyStateSvg from '../../../svg/empty-state.svg';
import DashboardSvg from '../../../svg/dashboard-icn.svg';
import LoaderSVG from '../../../svg/openreplay-preloader.svg';
import SignalGreenSvg from '../../../svg/signal-green.svg';
import SignalRedSvg from '../../../svg/signal-red.svg';
import NoBookmarks from '../../../svg/ca-no-bookmarked-session.svg';
import NoLiveSessions from '../../../svg/ca-no-live-sessions.svg';
import NoSessions from '../../../svg/ca-no-sessions.svg';
import NoSessionsInVault from '../../../svg/ca-no-sessions-in-vault.svg';
import NoWebhooks from '../../../svg/ca-no-webhooks.svg';
import NoMetadata from '../../../svg/ca-no-metadata.svg';
import NoIssues from '../../../svg/ca-no-issues.svg';
import NoAuditTrail from '../../../svg/ca-no-audit-trail.svg';
import NoAnnouncements from '../../../svg/ca-no-announcements.svg';

export enum ICONS {
    DASHBOARD_ICON = 'dashboard-icn',
    EMPTY_STATE = 'empty-state',
    LOGO_SMALL = 'logo-small',
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
    NO_SESSIONS_IN_VAULT = 'ca-no-sessions-in-vault',
    NO_ISSUES = 'ca-no-issues',
    NO_AUDIT_TRAIL = 'ca-no-audit-trail',
    NO_ANNOUNCEMENTS = 'ca-no-announcements',
}

interface Props {
    name: string;
    size?: number;
}
function AnimatedSVG(props: Props) {
    const { name, size = 24 } = props;
    const renderSvg = () => {
        switch (name) {
            case ICONS.LOADER:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={LoaderSVG} />;
            case ICONS.DASHBOARD_ICON:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={DashboardSvg} />;
            case ICONS.EMPTY_STATE:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={EmptyStateSvg} />;
            case ICONS.LOGO_SMALL:
                return <img style={{ width: size + 'px' }} src={LogoSmall} />;
            case ICONS.NO_RESULTS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoResultsSVG} />;
            case ICONS.SIGNAL_GREEN:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={SignalGreenSvg} />;
            case ICONS.SIGNAL_RED:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={SignalRedSvg} />;
            case ICONS.NO_BOOKMARKS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoBookmarks} />;
            case ICONS.NO_LIVE_SESSIONS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoLiveSessions} />;
            case ICONS.NO_SESSIONS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoSessions} />;
            case ICONS.NO_SESSIONS_IN_VAULT:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoSessionsInVault} />;
            case ICONS.NO_WEBHOOKS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoWebhooks} />;
            case ICONS.NO_METADATA:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoMetadata} />;
            case ICONS.NO_ISSUES:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoIssues} />;
            case ICONS.NO_AUDIT_TRAIL:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoAuditTrail} />;
            case ICONS.NO_ANNOUNCEMENTS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoAnnouncements} />;
            default:
                return null;
        }
    };
    return <div>{renderSvg()}</div>;
}

export default AnimatedSVG;
