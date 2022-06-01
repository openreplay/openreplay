import React from 'react';
import styles from './label.module.css';
import cn from 'classnames';

export default ({
  children, className, ...props
}) => (
  <div
    { ...props }
    className={ cn(className, styles.label, 'border') }
  >
    { children }
  </div>
);
