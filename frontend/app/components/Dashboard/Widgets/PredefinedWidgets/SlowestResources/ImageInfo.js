import React from 'react';
import { Tooltip } from 'UI';
import cn from 'classnames';
import styles from './imageInfo.module.css';

const supportedTypes = ['png', 'jpg', 'jpeg', 'svg'];

const ImageInfo = ({ data }) => {
  const canPreview = supportedTypes.includes(data.type);
  return (
    <div className={styles.name}>
      <Tooltip
        className={styles.popup}
        disabled={!canPreview}
        title={
          <img
            src={`${data.url}`}
            className={styles.imagePreview}
            alt="One of the slowest images"
          />
        }
      >
        <div className={cn({ [styles.hasPreview]: canPreview })}>
          <div className={styles.label}>{data.name}</div>
        </div>
      </Tooltip>
    </div>
  );
};

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
