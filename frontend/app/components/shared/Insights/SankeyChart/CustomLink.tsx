import React from 'react';
import { Layer } from 'recharts';

interface Props {
  payload: any;
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
}
function CustomLink(props: any) {
  const [fill, setFill] = React.useState('url(#linkGradient)');
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } =
    props;
  return (
    <Layer key={`CustomLink${index}`}>
      <path
        d={`
            M${sourceX},${sourceY + linkWidth / 2}
            C${sourceControlX},${sourceY + linkWidth / 2}
              ${targetControlX},${targetY + linkWidth / 2}
              ${targetX},${targetY + linkWidth / 2}
            L${targetX},${targetY - linkWidth / 2}
            C${targetControlX},${targetY - linkWidth / 2}
              ${sourceControlX},${sourceY - linkWidth / 2}
              ${sourceX},${sourceY - linkWidth / 2}
            Z
          `}
        fill={fill}
        strokeWidth="0"
        onMouseEnter={() => {
          setFill('rgba(57, 78, 255, 0.5)');
        }}
        onMouseLeave={() => {
          setFill('url(#linkGradient)');
        }}
      />
    </Layer>
  );
}

export default CustomLink;
