import React from 'react';
import { Icon, Popup } from 'UI';

interface Props {
    className: string
    onClick: () => void
    icon: string
    tooltip: string
}
function WidgetIcon(props: Props) {
    const { className, onClick, icon, tooltip } = props;
    return (
        <Popup title={tooltip} >
            <div className={className} onClick={onClick}>
                <Icon name={icon} size="14" />
            </div>
        </Popup>
    );
}

export default WidgetIcon;
