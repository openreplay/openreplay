import React, { memo, FC } from 'react';
import styles from './timeline.module.css';

interface Props {
    preview?: boolean;
}
export const Circle: FC<Props> = memo(function Box({ preview }) {
    return (
        <div
            className={ styles.positionTracker }
            role={preview ? 'BoxPreview' : 'Box'}
        />
    )
  })

export default Circle;