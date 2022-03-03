import React from 'react'

interface Props {
    data: any;
    params: any;
    colors: any;
    onClick?: (event, index) => void;
}
function CustomMetriPercentage(props: Props) {
    const { data } = props;
    return (
        <div className="flex flex-col items-center justify-center" style={{ height: '240px'}}>
            <div className="text-6xl">{data.count}</div>
            <div className="text-lg mt-6">{`${data.previousCount} ( ${data.countProgress}% ) from previous hour`}</div>
        </div>
    )
}

export default CustomMetriPercentage;
