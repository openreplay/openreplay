import React from 'react';
import cn from 'classnames';

interface Props {
    className?: string;
    label?: string;
    [x: string]: any;
}
export default (props: Props) => {
    const { className = '', label = '', ...rest } = props;
    return (
        <label className={cn('flex items-center cursor-pointer', className)}>
            <input type="checkbox" {...rest} />
            {label && <span className="ml-2 select-none mb-0">{label}</span>}
        </label>
    );
};
