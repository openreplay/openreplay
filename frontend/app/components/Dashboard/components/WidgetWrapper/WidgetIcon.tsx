import React from 'react';
import { Icon } from 'UI';
import { Tooltip } from 'react-tippy';

interface Props {
    className: string
    onClick: () => void
    icon: string
    tooltip: string
}
function WidgetIcon(props: Props) {
    const { className, onClick, icon, tooltip } = props;
    return (
        <Tooltip
            arrow
            size="small"
            title={tooltip}
            position="top"
        >
            <div className={className} onClick={onClick}>
                <Icon name={icon} size="14" />
            </div>
        </Tooltip>
    );
}

export default WidgetIcon;
