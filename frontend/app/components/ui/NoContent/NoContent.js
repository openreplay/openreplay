import { Icon } from 'UI';
import styles from './noContent.css';

export default ({
  title = "No data available.",
  subtext,
  animatedIcon = false,
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
    animatedIcon ? <div className={ styles[animatedIcon] } /> : (icon && <Icon name={icon} size={iconSize} />)
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
