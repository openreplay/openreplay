import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './tabItem.css';

const TabItem = ({ icon, label, count, iconColor = 'teal', active = false, leading, ...rest }) => {
    return (
        <div
            className={
                count === 0 ? stl.disabled : '',
                cn(stl.wrapper,
                active ? stl.active : '',
                "flex items-center py-2 justify-between")
            }
            { ...rest }
        >
            <div className="flex items-center">
                { icon && <Icon name={ icon } size="16" color={ iconColor } /> }
                <span className="ml-3 mr-1">{ label }</span>
                { count && <span>({ count })</span>}
            </div>
            { !!leading && leading }
        </div>
    );
}

export default TabItem;