import { Popup } from 'UI';
import cn from 'classnames';
import styles from './imageInfo.css';

const supportedTypes = ['png', 'jpg', 'jpeg', 'svg'];

const ImageInfo = ({ data }) => {
  const canPreview = supportedTypes.includes(data.type);
  return (
    <div className={ styles.name }>      
      <Popup
        className={ styles.popup }
        trigger={
          <div className={cn({ [styles.hasPreview]: canPreview})}>
            <div className={ styles.label }>{data.name}</div>
          </div>
        }
        disabled={!canPreview}
        content={ <img src={ `${ data.url }` } className={ styles.imagePreview } alt="One of the slowest images" /> }
      />
    </div>
  )
};

ImageInfo.displayName = 'ImageInfo';

export default ImageInfo;
