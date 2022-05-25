import React from 'react';
import LogoSmall from '../../../svg/logo-small.svg';
import NoResultsSVG from '../../../svg/no-results.svg';
import EmptyStateSvg from '../../../svg/empty-state.svg';
import DashboardSvg from '../../../svg/dashboard-icn.svg';

export enum ICONS {
    DASHBOARD_ICON = 'dashboard-icn',
    EMPTY_STATE = 'empty-state',
    LOGO_SMALL = 'logo-small',
    NO_RESULTS = 'no-results',
}

interface Props {
    name: string;
    size?: number;
}
function AnimatedSVG(props: Props) {
    const { name, size = 24 } = props;
    const renderSvg = () => {
        switch (name) {
            case ICONS.DASHBOARD_ICON:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={DashboardSvg} />
            case ICONS.EMPTY_STATE:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={EmptyStateSvg} />
            case ICONS.LOGO_SMALL:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={LogoSmall} />
            case ICONS.NO_RESULTS:
                return <object style={{ width: size + 'px' }} type="image/svg+xml" data={NoResultsSVG} />
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