import React from 'react';
import styles from './label.module.css';
import cn from 'classnames';

export default ({
  children, className, ...props
}) => (
  <div
    { ...props }
    className={ cn('border rounded bg-gray-lightest px-2 w-fit', className) }
  >
    { children }
  </div>
);
