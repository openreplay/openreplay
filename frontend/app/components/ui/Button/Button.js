import React from 'react';
// import { Button } from 'semantic-ui-react';
import classnames from 'classnames';
import styles from './button.module.css';

export default ({
  className,
  variant = "default",
  size = '',
  primary,
  outline,
  plain = false,
  marginRight = false,
  hover = false,
  noPadding = false,
  success = false,
  error = false,
  minWidth,
  disabled = false,
  plainText = false,
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

  return (
    <button
      { ...props }
      style={{ minWidth: minWidth, marginRight: marginRight ? marginRight : '0' }}
      className={ classnames(classes,
        // { 'bg-white hover:bg-gray-lightest border border-gray-light' : !primary },
        // { 'bg-teal color-white' : primary },
        { 'opacity-40 pointer-events-none' : disabled },
        className,
        // size,
        // { 'btn-disabled' : disabled },
        // styles[ plain ? 'plain' : '' ],
        // styles[ hover ? 'hover' : '' ],
        // styles.button,
        // styles[ primary ? 'primary' : '' ],
        // styles[ outline ? 'outline' : '' ],
        // styles[ noPadding ? 'no-padding' : '' ],
        // styles[ success ? 'success' : '' ],
        // styles[ error ? 'error' : '' ],
        // styles[ marginRight ? 'margin-right' : '' ],
        // styles[ plainText ? 'plainText' : '' ],
      ) }
    />
  );
}
