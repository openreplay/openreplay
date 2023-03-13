import React from 'react';
import { Layer } from 'recharts';

// interface Props {
//   payload: any;
//   sourceX: number;
//   targetX: number;
//   sourceY: number;
//   targetY: number;
//   sourceControlX: number;
//   targetControlX: number;
//   linkWidth: number;
//   index: number;
// }
function CustomLink(props: any) {
  const [fill, setFill] = React.useState('url(#linkGradient)');
  const { payload, sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, activeLink } =
    props;
  const activeSource = activeLink?.payload.source;
  const activeTarget = activeLink?.payload.target;
  const isActive = activeSource?.name === payload.source.name && activeTarget?.name === payload.target.name;

  const onClick = () => {
    if (props.onClick) {
      props.onClick(props);
    }
  };
  
  return (
    <Layer key={`CustomLink${index}`} onClick={onClick}>
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
        fill={isActive ? 'rgba(57, 78, 255, 0.5)' : fill}
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
