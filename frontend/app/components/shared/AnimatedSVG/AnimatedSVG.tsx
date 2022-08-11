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
    NO_SESSIONS_IN_VAULT = 'ca-no-sessions-in-vault'
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
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={LogoSmall} />;
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
            default:
                return null;
        }
    };
    return <div>{renderSvg()}</div>;
}

export default AnimatedSVG;
