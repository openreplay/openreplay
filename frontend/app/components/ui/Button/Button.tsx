import React from 'react';
import cn from 'classnames';
import { CircularLoader, Icon, Popup } from 'UI';

interface Props {
    className?: string;
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'default' | 'primary' | 'text' | 'text-primary' | 'text-red' | 'outline' | 'green'
    loading?: boolean;
    icon?: string;
    rounded?: boolean;
    tooltip?: any;
    [x: string]: any;
}
export default (props: Props) => {
    const {
        icon = '',
        className = '',
        variant = 'default', // 'default|primary|text|text-primary|text-red|outline',
        type = 'button',
        size = '',
        disabled = false,
        children,
        loading = false,
        rounded = false,
        tooltip = null,
        ...rest
    } = props;

    let classes = ['relative flex items-center h-10 px-3 rounded tracking-wide whitespace-nowrap'];
    let iconColor = variant === 'text' || variant === 'default' ? 'gray-dark' : 'teal';

    if (variant === 'default') {
        classes.push('bg-white hover:bg-gray-light border border-gray-light');
    }

    if (variant === 'primary') {
        classes.push('bg-teal color-white hover:bg-teal-dark');
    }

    if (variant === 'green') {
        classes.push('bg-green color-white hover:bg-green-dark');
        iconColor = 'white';
    }

    if (variant === 'text') {
        classes.push('bg-transparent color-gray-dark hover:bg-gray-light hover:color-gray-dark');
    }

    if (variant === 'text-primary') {
        classes.push('bg-transparent color-teal hover:bg-teal-light hover:color-teal-dark');
    }

    if (variant === 'text-red') {
        classes.push('bg-transparent color-red hover:bg-teal-light');
    }

    if (variant === 'outline') {
        classes.push('bg-white color-teal border border-teal hover:bg-teal-light');
    }

    if (disabled) {
        classes.push('opacity-40 pointer-events-none');
    }

    if (variant === 'primary') {
        iconColor = 'white';
    }
    if (variant === 'text-red') {
        iconColor = 'red';
    }

    if (rounded) {
        classes = classes.map((c) => c.replace('rounded', 'rounded-full h-10 w-10 justify-center'));
    }

    const render = () => (
        <button {...rest} type={type} className={cn(classes, className)}>
            {icon && <Icon className={cn({ 'mr-2': children })} name={icon} color={iconColor} size="16" />}
            {loading && (
                <div className="absolute flex items-center justify-center inset-0 z-1 rounded">
                    <CircularLoader />
                </div>
            )}
            <div className={cn({ 'opacity-0': loading }, 'flex items-center')}>{children}</div>
        </button>
    );

    return tooltip ? <Popup content={tooltip.title} {...tooltip}>{render()}</Popup> : render();
};
