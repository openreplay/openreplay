import React from 'react';
import { Icon } from 'UI';
import styles from './noContent.module.css';

export default ({
  title = <div>No data available.</div>,
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
