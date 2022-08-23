import React from 'react';
import styles from './message.module.css';
import { Icon } from 'UI';
import cn from 'classnames';

// TODO this has to be improved
const Message = ({
  icon = 'check',
  hidden = false,
  visible = false,
  children,
  inline = false,
  success = false,
  info = true,
  text,
}) =>
  visible || !hidden ? (
    <div className={cn(styles.message, 'flex items-center')} data-inline={inline}>
      <Icon
        name={success ? 'check' : 'close'}
        color={success ? 'green' : 'red'}
        className="mr-2"
        size={success ? 20 : 14}
      />
      {text ? text : children}
    </div>
  ) : null;

Message.displayName = 'Message';

export default Message;
