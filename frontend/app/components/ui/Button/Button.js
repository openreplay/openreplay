import { Button } from 'semantic-ui-react';
import classnames from 'classnames';
import styles from './button.css';

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
  ...props
}) => (
  <Button
    { ...props }
    style={{ minWidth: minWidth }}
    className={ classnames(
      className,
      size,
      styles[ plain ? 'plain' : '' ],
      styles[ hover ? 'hover' : '' ],
      styles.button,
      styles[ primary ? 'primary' : '' ],
      styles[ outline ? 'outline' : '' ],
      styles[ noPadding ? 'no-padding' : '' ],
      styles[ success ? 'success' : '' ],
      styles[ error ? 'error' : '' ],
      styles[ marginRight ? 'margin-right' : '' ],
    ) }
  />
);
