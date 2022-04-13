import { Popup, Icon, TextEllipsis } from 'UI';
import styles from './imageInfo.css';

const ImageInfo = ({ data }) => (
  <div className={ styles.name }>
    <TextEllipsis text={data.urlHostpath} />
  </div>
);

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
