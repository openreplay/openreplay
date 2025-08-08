import React, { memo } from 'react';
import cn from 'classnames';
import styles from './styles.module.css';

interface IProps {
  preview?: boolean;
  isGreen?: boolean;
  paused?: boolean;
}

export const ProgressCircle = memo(({ preview, isGreen, paused }: IProps) => (
  <div
    className={cn(
      styles.positionTracker,
      { [styles.greenTracker]: isGreen },
      { [styles.paused]: paused },
    )}
    id="click-ignore"
    role={preview ? 'BoxPreview' : 'Box'}
  />
));
