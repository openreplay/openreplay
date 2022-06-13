import React from 'react';

interface Props {
    filter: any;
}
function FunnelStepText(props: Props) {
    const { filter } = props;
    const total = filter.value.length;
    return (
        <div className="mb-2 color-gray-medium">
            <span className="color-gray-darkest">{filter.label}</span>
            <span className="mx-1">{filter.operator}</span>
            {filter.value.map((value: any, index: number) => (
                <span key={index}>
                    <span key={index} className="font-medium color-gray-darkest">{value}</span>
                    {index < total - 1 && <span className="mx-1 color-gray-medium">or</span>}
                </span>
            ))}
        </div>
    );
}

export default FunnelStepText;