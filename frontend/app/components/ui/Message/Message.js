import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import styles from './message.module.css';

// TODO this has to be improved
function Message({
  icon = 'check',
  hidden = false,
  visible = false,
  children,
  inline = false,
  success = false,
  info = true,
  text = undefined,
}) {
  return visible || !hidden ? (
    <div
      className={cn(styles.message, 'flex items-center')}
      data-inline={inline}
    >
      <Icon
        name={success ? 'check' : 'close'}
        color={success ? 'green' : 'red'}
        className="mr-2"
        size={success ? 20 : 14}
      />
      {text || children}
    </div>
  ) : null;
}

Message.displayName = 'Message';

export default Message;
