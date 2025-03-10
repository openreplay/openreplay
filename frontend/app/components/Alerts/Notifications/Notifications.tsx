import React, { useEffect } from 'react';
import { Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import AlertTriggersModal from 'Shared/AlertTriggersModal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;

function Notifications() {
  const { t } = useTranslation();
  const { showModal } = useModal();
  const { notificationStore } = useStore();
  const count = notificationStore.notificationsCount;

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        void notificationStore.fetchNotificationsCount();
      } catch (e) {
        console.error(e);
      }
    }, AUTOREFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <Badge dot={count > 0} size="small">
      <Tooltip title={t('Alerts')}>
        <Button
          icon={<BellOutlined />}
          onClick={() => showModal(<AlertTriggersModal />, { right: true })}
        >
          {/* <Icon name='bell' size='18' color='gray-dark' /> */}
        </Button>
      </Tooltip>
    </Badge>
  );
}

export default observer(Notifications);
