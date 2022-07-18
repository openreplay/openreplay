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
    duration?: number;
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
    delay = 1000,
    hideDelay = 0,
    content = '',
    duration = 0,
    disabled = false,
    arrow = true,
    theme = 'dark',
    style = {},
    interactive = false,
    children,
}: // ...props
Props) => (
    <Tooltip
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
        duration={0}
        hideDelay={hideDelay}
    >
        {children}
    </Tooltip>
);
