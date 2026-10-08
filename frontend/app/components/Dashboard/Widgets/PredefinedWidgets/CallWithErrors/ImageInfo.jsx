import { Truncated } from '@/ui/data/truncated';
import React from 'react';

import styles from './imageInfo.module.css';

function ImageInfo({ data }) {
  return (
    <div className={styles.name}>
      <Truncated text={data.urlHostpath} />
    </div>
  );
}

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
