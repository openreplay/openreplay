import { Popup, Icon } from 'UI';
import styles from './imageInfo.css';

const ImageInfo = ({ data }) => (
  <div className={ styles.name }>
    <Popup
      className={ styles.popup }
      trigger={
        <div className={ styles.imageWrapper }>
          <Icon name="camera-alt" size="18" color="gray-light" />
          <div className={ styles.label }>{ 'Preview' }</div>
        </div>
      }
      content={ <img src={ `//${ data.url }` } className={ styles.imagePreview } alt="One of the slowest images" /> }
    />
    <Popup
      trigger={
        <span>{ data.name }</span>
      }
      disabled
      content={ data.url }
    />
  </div>
);

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
