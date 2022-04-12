import React from 'react'
import { numberWithCommas } from 'App/utils';

interface Props {
    data: any;
    params: any;
    colors: any;
    onClick?: (event, index) => void;
}
function CustomMetriPercentage(props: Props) {
    const { data = {} } = props;
    return (
        <div className="flex flex-col items-center justify-center" style={{ height: '240px'}}>
            <div className="text-6xl">{numberWithCommas(data.count)}</div>
            <div className="text-lg mt-6">{`${parseInt(data.previousCount).toFixed(1)} ( ${parseInt(data.countProgress).toFixed(1)}% )`}</div>
            <div className="color-gray-medium">from previous period.</div>
        </div>
    )
}

export default CustomMetriPercentage;
