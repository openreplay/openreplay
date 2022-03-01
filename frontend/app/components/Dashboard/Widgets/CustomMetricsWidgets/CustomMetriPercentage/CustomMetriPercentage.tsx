import React from 'react'

interface Props {
    data: any;
}
function CustomMetriPercentage(props: Props) {
    const { data } = props;
    return (
        <div className="flex flex-col items-center justify-center" style={{ height: '240px'}}>
            <div className="text-6xl">0%</div>
            <div className="text-lg mt-6">0 ( 0.0% ) from previous hour</div>
        </div>
    )
}

export default CustomMetriPercentage;
