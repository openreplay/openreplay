import React from 'react';

interface IProps {
  scale: number;
  live?: boolean;
  left: number;
  time: number;
}

const styles = {
  display: 'block',
  pointerEvents: 'none' as const,
  height: '10px',
  zIndex: 1,
}
const replayBg = '#d0d4f2' // active blue border
const liveBg = 'rgba(66, 174, 94, 0.3)' // light green shade

/** Playtime progress bar */
export function ProgressBar ({ scale, live = false, left, time }: IProps) {
  return (
    <div
      style={{
        ...styles,
        width: `${ time * scale }%`,
        backgroundColor: live && left > 99 ? liveBg : replayBg
      }}
    />
  )
}

ProgressBar.displayName = 'ProgressBar';
