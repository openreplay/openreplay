import React from 'react';

interface IProps {
  scale: number;
  live?: boolean;
  left: number;
}

const styles = {
  display: 'block',
  pointerEvents: 'none' as const,
  height: '3px',
  borderRadius: '999px',
  zIndex: 1,
};
const replayBg = 'var(--m-content-secondary)';
const liveBg = 'var(--m-content-success)';

/** Playtime progress bar */
export function ProgressBar({ live = false, left }: IProps) {
  return (
    <div
      style={{
        ...styles,
        width: `${Math.min(left, 100)}%`,
        backgroundColor: live && left > 99 ? liveBg : replayBg,
      }}
    />
  );
}

ProgressBar.displayName = 'ProgressBar';
