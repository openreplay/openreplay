import React, { memo, FC } from 'react';
import styles from './timeline.css';

interface Props {
    preview?: boolean;
}
export const Circle: FC<Props> = memo(function Box({ preview }) {
    // const backgroundColor = yellow ? 'yellow' : 'white'
    return (
        <div
            className={ styles.positionTracker }
            // style={ { left: `${ time * scale }%` } }
            role={preview ? 'BoxPreview' : 'Box'}
        />
    )
  })

export default Circle;