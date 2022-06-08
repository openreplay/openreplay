import React from 'react';
import cn from 'classnames';
import stl from './widgetWrapper.module.css';

interface IProps {
    isTemplate?: boolean;
    onClick: () => void;
}
function TemplateOverlay(props: IProps) {
    return (
        <div onClick={props.onClick} className={cn('absolute cursor-pointer z-10', stl.overlay, { [stl.overlayDashboard]: !props.isTemplate } )} />
    );
}

export default TemplateOverlay;
