import { Tooltip, Icon } from 'UI';
import styles from './imageInfo.module.css';

const ImageInfo = ({ data }) => (
  <div className={styles.name}>
    <Tooltip
      className={styles.Tooltip}
      title={
        <img
          src={`//${data.url}`}
          className={styles.imagePreview}
          alt="One of the slowest images"
        />
      }
    >
      <div className={styles.imageWrapper}>
        <Icon name="camera-alt" size="18" color="gray-light" />
        <div className={styles.label}>{'Preview'}</div>
      </div>
    </Tooltip>
    <Tooltip title={data.url}>
      <span>{data.name}</span>
    </Tooltip>
  </div>
);

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
