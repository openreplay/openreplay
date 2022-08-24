import React from 'react';
import stl from './xrayButton.module.css';
import cn from 'classnames';
import { Popup } from 'UI';

interface Props {
    onClick?: () => void;
    isActive?: boolean;
}
function XRayButton(props: Props) {
    const { isActive } = props;
    return (
        <Popup content="Get a quick overview on the issues in this session." delay={0} disabled={isActive}>
            <button className={cn(stl.wrapper, { [stl.default] : !isActive, [stl.active] : isActive})} onClick={props.onClick}>
                X-RAY
            </button>
        </Popup>
    );
}

export default XRayButton;
