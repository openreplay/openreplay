import React from 'react';

interface Props {
    filter: any;
    isHorizontal?: boolean;
}
function FunnelStepText(props: Props) {
  const { filter } = props;
  const total = filter.value.length;
  const additionalStyle = props.isHorizontal ? {
    whiteSpace: 'nowrap', maxWidth: 210, textOverflow: 'ellipsis', overflow: 'hidden',
  } : {};
  return (
    <div className="color-gray-medium" style={additionalStyle}>
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
