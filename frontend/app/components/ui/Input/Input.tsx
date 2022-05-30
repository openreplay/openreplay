import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

interface Props {
    wrapperClassName?: string;
    className: string;
    icon?: string;
    leadingButton?: React.ReactNode;
    [x:string]: any;
}
function Input(props: Props) {
    const { className, leadingButton = "", wrapperClassName = "", icon = "", ...rest } = props;
    return (
        <div className={cn({ "relative" : icon || leadingButton }, wrapperClassName)}>
            {icon && <Icon name={icon} className="absolute top-0 bottom-0 my-auto ml-4" size="14" />}
            <input className={ cn("p-2 border border-gray-light bg-white h-10 w-full rounded", className, { 'pl-10' : icon }) } {...rest} />
            { leadingButton && <div className="absolute top-0 bottom-0 right-0">{ leadingButton }</div> }
        </div>
    );
}

export default Input;