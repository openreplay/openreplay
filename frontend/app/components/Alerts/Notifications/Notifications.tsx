import React, { useEffect } from 'react';
import stl from './notifications.module.css';
import { connect } from 'react-redux';
import { Icon, Tooltip } from 'UI';
import { fetchList, setViewed, clearAll } from 'Duck/notifications';
import { setLastRead } from 'Duck/announcements';
import { useModal } from 'App/components/Modal';
import AlertTriggersModal from 'Shared/AlertTriggersModal';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;

interface Props {
  notifications: any;
  fetchList: any;
}
function Notifications(props: Props) {
  const { showModal } = useModal();
  const { notificationStore } = useStore();
  const count = useObserver(() => notificationStore.notificationsCount);

  useEffect(() => {
    const interval = setInterval(() => {
      notificationStore.fetchNotificationsCount();
    }, AUTOREFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return useObserver(() => (
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
  ));
}

export default connect(
  (state: any) => ({
    notifications: state.getIn(['notifications', 'list']),
  }),
  { fetchList, setLastRead, setViewed, clearAll }
)(Notifications);
