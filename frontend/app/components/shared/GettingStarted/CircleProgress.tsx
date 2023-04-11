import React, { useEffect, useState } from 'react';

interface Props {
  percentage: number;
  radius?: number;
  progressColor?: string;
  bgColor?: string;
  label?: string;
}
const CircleProgress = ({
  percentage = 0,
  radius = 18,
  progressColor = '#394eff',
  bgColor = '#9fa8da',
  label = '',
}: Props) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const progress = percentage / 100;
    const _radius = radius * 0.8;
    const circumference = 2 * Math.PI * _radius;
    const offsetValue = circumference * (1 - progress);

    setOffset(offsetValue);
  }, [percentage, radius]);

  const strokeWidth = radius * 0.3;
  const _radius = radius * 0.8;

  const circumference = 2 * Math.PI * _radius;
  const dashOffset = circumference * (1 - (percentage / 100));
  const circleStyle = {
    transition: 'stroke-dashoffset 1s ease-in-out',
  };

  return (
    <svg width={radius * 2} height={radius * 2}>
      <circle
        cx={radius}
        cy={radius}
        r={_radius}
        stroke={bgColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={radius}
        cy={radius}
        r={_radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset + ''}
        fill="none"
        transform={`rotate(-90 ${radius} ${radius})`}
        style={circleStyle}
      />
      <text
        x={radius}
        y={radius}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={radius * 0.5}
      >
        {label}
      </text>
    </svg>
  );
};

export default CircleProgress;
