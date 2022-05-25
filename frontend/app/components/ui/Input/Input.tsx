import React from 'react';
import cn from 'classnames';

interface Props {
    className: string;
    [x:string]: any;
}
function Input(props: Props) {
    const { className, ...rest } = props;
    return (
        <input className={ cn("p-2 border border-color-gray rounded", className) } {...rest} />
    );
}

export default Input;