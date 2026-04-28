import React from 'react';
import { TextEllipsis } from 'UI';
import styles from './imageInfo.module.css';

function ImageInfo({ data }) {
  return (
    <div className={styles.name}>
      <TextEllipsis text={data.urlHostpath} />
    </div>
  );
}

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
