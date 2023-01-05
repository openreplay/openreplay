import React, { useEffect } from 'react';
import stl from './notifications.module.css';
import { Icon, Tooltip } from 'UI';
import { useModal } from 'App/components/Modal';
import AlertTriggersModal from 'Shared/AlertTriggersModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;

function Notifications() {
  const { showModal } = useModal();
  const { notificationStore } = useStore();
  const count = notificationStore.notificationsCount;

  useEffect(() => {
    const interval = setInterval(() => {
      void notificationStore.fetchNotificationsCount();
    }, AUTOREFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <Tooltip title={`Alerts`}>
      <div
        className={stl.button}
        onClick={() => showModal(<AlertTriggersModal />, { right: true })}
      >
        <div className={stl.counter} data-hidden={count === 0}>
          {count}
        </div>
        <Icon name="bell" size="18" color="gray-dark" />
      </div>
    </Tooltip>
  );
}

export default observer(Notifications)