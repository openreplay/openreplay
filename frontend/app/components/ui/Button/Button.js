import React from 'react';
// import { Button } from 'semantic-ui-react';
import classnames from 'classnames';
import styles from './button.module.css';

export default ({
  className,
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
}) => (
  <button
    { ...props }
    style={{ minWidth: minWidth, marginRight: marginRight ? marginRight : '0' }}
    className={ classnames(
      "flex items-center h-10 px-3  rounded",
      { 'bg-white hover:bg-gray-lightest border border-gray-light' : !primary },
      { 'bg-teal color-white' : primary },
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
