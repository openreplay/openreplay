import React from 'react';
import cn from 'classnames';
import stl from './widgetWrapper.css';

interface IProps {
    isTemplate?: boolean;
}
function TemplateOverlay(props: IProps) {
    return (
        <div className={cn('absolute cursor-pointer z-10', stl.overlay, { [stl.overlayDashboard]: !props.isTemplate } )} />
    );
}

export default TemplateOverlay;
