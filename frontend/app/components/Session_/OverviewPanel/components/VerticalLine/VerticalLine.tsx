import React from 'react';
import cn from 'classnames';

interface Props {
    left: number;
    className?: string;
    height?: string;
    width?: string;
}
function VerticalLine(props: Props) {
    const { left, className = 'border-gray-dark', height = '221px', width = '1px' } = props;
    return <div className={cn('absolute border-r border-dashed z-10', className)} style={{ left: `${left}%`, height, width }} />;
}

export default VerticalLine;
