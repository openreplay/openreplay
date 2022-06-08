import React from 'react';
import LogoSmall from '../../../svg/logo-small.svg';
import NoResultsSVG from '../../../svg/no-results.svg';
import EmptyStateSvg from '../../../svg/empty-state.svg';
import DashboardSvg from '../../../svg/dashboard-icn.svg';
import LoaderSVG from '../../../svg/openreplay-preloader.svg';
import SignalGreenSvg from '../../../svg/signal-green.svg';
import SignalRedSvg from '../../../svg/signal-red.svg';

export enum ICONS {
    DASHBOARD_ICON = 'dashboard-icn',
    EMPTY_STATE = 'empty-state',
    LOGO_SMALL = 'logo-small',
    NO_RESULTS = 'no-results',
    LOADER = 'openreplay-preloader',
    SIGNAL_GREEN = 'signal-green',
    SIGNAL_RED = 'signal-red'
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
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={LoaderSVG} />
            case ICONS.DASHBOARD_ICON:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={DashboardSvg} />
            case ICONS.EMPTY_STATE:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={EmptyStateSvg} />
            case ICONS.LOGO_SMALL:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={LogoSmall} />
            case ICONS.NO_RESULTS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoResultsSVG} />
            case ICONS.SIGNAL_GREEN:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={SignalGreenSvg} />
            case ICONS.SIGNAL_RED:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={SignalRedSvg} />
            default:
                return null;
        }
    }
    return (
        <div>
           {renderSvg()} 
        </div>
    );
}

export default AnimatedSVG;