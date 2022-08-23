import React from 'react';
import { Tooltip, Theme, Trigger, Position } from 'react-tippy';

interface Props {
    content?: any;
    title?: any;
    trigger?: Trigger;
    position?: Position;
    className?: string;
    delay?: number;
    hideDelay?: number;
    disabled?: boolean;
    arrow?: boolean;
    open?: boolean;
    style?: any;
    theme?: Theme;
    interactive?: boolean;
    children?: any;
    // [x:string]: any;
}
export default ({
    position = 'top',
    title = '',
    className = '',
    trigger = 'mouseenter',
    delay = 0,
    hideDelay = 0,
    content = '',
    disabled = false,
    arrow = false,
    theme = 'dark',
    style = {},
    interactive = false,
    children,
}: // ...props
Props) => (
    <Tooltip
        animation="fade"
        position={position}
        className={className}
        trigger={trigger}
        html={content || title}
        disabled={disabled}
        arrow={arrow}
        delay={delay}
        hideOnClick={true}
        hideOnScroll={true}
        theme={theme}
        style={style}
        interactive={interactive}
        hideDelay={hideDelay}
    >
        {children}
    </Tooltip>
);
