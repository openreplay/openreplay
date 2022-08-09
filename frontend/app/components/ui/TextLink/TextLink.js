import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

function TextLink({ target = '_blank', href = '', icon = '', label = '', className = '' }) {
    return (
        <a target={target} className={cn('link cursor-pointer flex items-center default-hover', className)} href={href}>
            {icon && <Icon name={icon} size="16" color="teal" marginRight="5" />}
            {label}
        </a>
    );
}

export default TextLink;
