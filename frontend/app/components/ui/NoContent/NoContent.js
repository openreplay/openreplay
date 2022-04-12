import { Icon } from 'UI';
import styles from './noContent.css';

export default ({
  title = "No data available.",
  subtext,
  icon,
  iconSize = 100,
  size,
  show = true,
  children = null,
  empty = false,
  image = null,
  style = {},
}) => (!show ? children :
<div className={ `${ styles.wrapper } ${ size && styles[ size ] }` } style={style}>
  {
    // icon && <div className={ empty ? styles.emptyIcon : styles.icon } />
    icon && <Icon name={icon} size={iconSize} />
  }
  { title && <div className={ styles.title }>{ title }</div> }
  {
    subtext &&
    <div className={ styles.subtext }>{ subtext }</div>
  }
  {
    image && <div className="mt-4 flex justify-center">{ image } </div>
  }
</div>
);
