import React from 'react';
import { Layer, Rectangle } from 'recharts';

function CustomLink(props: any) {
  const [fill, setFill] = React.useState('url(#linkGradient)');
  const {
    hoveredLinks,
    activeLinks,
    payload,
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
    activeLink
  } =
    props;
  const isActive = activeLinks.length > 0 && activeLinks.includes(payload.id);
  const isHover = hoveredLinks.length > 0 && hoveredLinks.includes(payload.id);

  const onClick = () => {
    if (props.onClick) {
      props.onClick(props.payload);
    }
  };

  return (
    <Layer
      key={`CustomLink${index}`}
      onClick={onClick}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
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
        fill={isActive ? 'rgba(57, 78, 255, 1)' : (isHover ? 'rgba(57, 78, 255, 0.5)' : fill)}
        strokeWidth='1'
        strokeOpacity={props.strokeOpacity}
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
