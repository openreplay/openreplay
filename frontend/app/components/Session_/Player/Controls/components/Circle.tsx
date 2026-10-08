import cn from 'classnames';
import React, { FC, memo } from 'react';

import styles from '../timeline.module.css';

interface Props {
  preview?: boolean;
  isGreen?: boolean;
}
export const Circle: FC<Props> = memo(({ preview, isGreen }) => (
  <div
    className={cn(styles.positionTracker, { [styles.greenTracker]: isGreen })}
    role={preview ? 'BoxPreview' : 'Box'}
  />
));

export default Circle;
