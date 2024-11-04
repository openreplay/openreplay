import React from 'react';
import { TextEllipsis } from 'UI';
import styles from './imageInfo.module.css';

const ImageInfo = ({ data }) => (
  <div className={ styles.name }>
    <TextEllipsis text={data.urlHostpath} />
  </div>
);

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
