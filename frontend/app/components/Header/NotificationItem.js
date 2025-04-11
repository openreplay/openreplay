import { checkForRecent } from 'App/dateRange';
import React from 'react';
import styles from './notificationItem.module.css';

function NotificationItem({
  notification: { notificationId, createdAt, name, text, viewed },
  onClick,
}) {
  return (
    <div
      className={styles.wrapper}
      data-viewed={viewed}
      onClick={() => (!viewed ? onClick(notificationId) : null)}
    >
      <div className={styles.time}>
        {checkForRecent(createdAt, 'LLL dd, yyyy, hh:mm a')}
      </div>
      <div className={styles.title}>{name}</div>
      {text && <div className={styles.details}>{text}</div>}
    </div>
  );
}

NotificationItem.displayName = 'NotificationItem';

export default NotificationItem;
