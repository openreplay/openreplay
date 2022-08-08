import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

interface Props {
    wrapperClassName?: string;
    className?: string;
    icon?: string;
    leadingButton?: React.ReactNode;
    type?: string;
    rows?: number;
    [x: string]: any;
}
const Input = React.forwardRef((props: Props, ref: any) => {
    const { className = '', leadingButton = '', wrapperClassName = '', icon = '', type = 'text', rows = 4, ...rest } = props;
    return (
        <div className={cn({ relative: icon || leadingButton }, wrapperClassName)}>
            {icon && <Icon name={icon} className="absolute top-0 bottom-0 my-auto ml-4" size="14" />}
            {type === 'textarea' ? (
                <textarea
                    ref={ref}
                    rows={rows}
                    style={{ resize: 'none' }}
                    maxLength={500}
                    className={cn('p-2 border border-gray-light bg-white w-full rounded', className, { 'pl-10': icon })}
                    {...rest}
                />
            ) : (
                <input
                    ref={ref}
                    type={type}
                    style={{ height: '36px' }}
                    className={cn('p-2 border border-gray-light bg-white w-full rounded', className, { 'pl-10': icon })}
                    {...rest}
                />
            )}

            {leadingButton && <div className="absolute top-0 bottom-0 right-0">{leadingButton}</div>}
        </div>
    );
});

export default Input;
