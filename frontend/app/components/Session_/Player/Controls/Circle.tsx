import React, { memo, FC } from 'react';
import styles from './timeline.module.css';
import cn from 'classnames';

interface Props {
    preview?: boolean;
    isGreen?: boolean;
}
export const Circle: FC<Props> = memo(function Box({ preview, isGreen }) {
    return (
        <div
            className={ cn(styles.positionTracker, { [styles.greenTracker]: isGreen }) }
            role={preview ? 'BoxPreview' : 'Box'}
        />
    )
  })

export default Circle;
