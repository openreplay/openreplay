import React from 'react';
import { Layer, Rectangle } from 'recharts';
import NodeButton from './NodeButton';
import NodeDropdown from './NodeDropdown';

function CustomNode({ x, y, width, height, index, payload, containerWidth }: any) {
  const isOut = x + width + 6 > containerWidth;

  console.log('payload', payload);

  return (
    <Layer key={`CustomNode${index}`} style={{ cursor: 'pointer' }}>
      <Rectangle x={x} y={y} width={width} height={height} fill='#394EFF' fillOpacity='1' />

      <foreignObject
        x={isOut ? x - 6 : x + width + 5}
        y={0}
        height={48}
        style={{ width: '150px', padding: '2px' }}
      >
        <NodeDropdown payload={payload} />
      </foreignObject>

      <foreignObject
        x={isOut ? x - 6 : x + width + 5}
        y={y + 5}
        height='200'
        style={{ width: '150px' }}
      >
        <NodeButton payload={payload} />
      </foreignObject>
    </Layer>
  );
}

export default CustomNode;