import React, { memo } from 'react';
import cn from 'classnames';
import styles from './styles.module.css';

interface IProps {
  preview?: boolean;
  isGreen?: boolean;
}

export const ProgressCircle = memo(({ preview, isGreen }: IProps) => (
  <div
    className={cn(styles.positionTracker, { [styles.greenTracker]: isGreen })}
    id="click-ignore"
    role={preview ? 'BoxPreview' : 'Box'}
  />
));
