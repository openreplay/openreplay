import React from 'react';
// import { Button } from 'semantic-ui-react';
import cn from 'classnames';
// import styles from './button.module.css';

export default ({
  className,
  variant = "default",
  type = "button",
  size = '',
  noPadding = false,
  minWidth,
  disabled = false,
  ...props
}) => {
  const classes = ['flex items-center h-10 px-3 rounded tracking-wide'];
  if (variant === 'default') {
    classes.push('bg-white hover:bg-gray-lightest border border-gray-light')
  }

  if (variant === 'primary') {
    classes.push('bg-teal color-white hover:bg-teal-dark')
  }

  if (variant === 'text') {
    classes.push('bg-transparent color-gray-dark hover:bg-gray-lightest hover:color-gray-dark')
  }

  if (variant === 'text-primary') {
    classes.push('bg-transparent color-teal hover:bg-teal-light hover:color-teal-dark')
  }

  if (variant === 'outline') {
    classes.push('bg-white color-teal border border-teal hover:bg-teal-light')
  }

  if (disabled) {
    classes.push('opacity-40 pointer-events-none')
  }

  return (
    <button
      { ...props }
      type={type}
      style={{ minWidth: minWidth}}
      className={ cn(classes, className ) }
    />
  );
}
