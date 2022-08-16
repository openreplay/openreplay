import React from 'react';
import stl from './xrayButton.module.css';
import cn from 'classnames';

interface Props {
    onClick?: () => void;
    isActive?: boolean;
}
function XRayButton(props: Props) {
    const { isActive } = props;
    return (
        <button className={cn(stl.wrapper, { [stl.default] : !isActive, [stl.active] : isActive})} onClick={props.onClick}>
            X-RAY
        </button>
    );
}

export default XRayButton;
