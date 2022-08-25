import React from 'react';
import { Tooltip, Theme, Trigger, Position, Animation } from 'react-tippy';

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
    style?: any;
    theme?: Theme;
    interactive?: boolean;
    children?: any;
    animation?: Animation;
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
    animation = 'fade',
}: // ...props
Props) => (
    // @ts-ignore
    <Tooltip
        animation={animation}
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
