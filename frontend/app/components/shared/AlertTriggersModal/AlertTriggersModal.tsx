import { Button } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import ListItem from './ListItem';

interface Props {}
function AlertTriggersModal(props: Props) {
  const { t } = useTranslation();
  const { notificationStore } = useStore();
  const count = notificationStore.notificationsCount;
  const list = notificationStore.notifications;
  const loading = notificationStore.loading;
  const markingAsRead = notificationStore.markingAsRead;

  const onClearAll = () => {
    const firstItem = list[0];
    if (!firstItem) return;
    notificationStore.ignoreAllNotifications({
      endTimestamp: firstItem.createdAt.ts,
    });
  };

  const onClear = (notification: any) => {
    notificationStore.ignoreNotification(notification.notificationId);
  };

  useEffect(() => {
    notificationStore.fetchNotifications();
  }, []);

  return (
    <div className="bg-white box-shadow h-screen overflow-y-auto">
      <div className="flex items-center justify-between p-5 text-2xl">
        <div>{t('Alerts')}</div>
        {count > 0 && (
          <div className="">
            <Button variant="text" onClick={onClearAll} disabled={count === 0}>
              <span className={cn('text-sm color-gray-medium')}>
                {t('IGNORE ALL')}
              </span>
            </Button>
          </div>
        )}
      </div>

      <div className="pb-5">
        <Loader loading={loading}>
          <NoContent
            title={
              <div className="flex items-center justify-between">
                <AnimatedSVG name={ICONS.EMPTY_STATE} size="100" />
              </div>
            }
            subtext="There are no alerts to show"
            show={!loading && list.length === 0}
            size="small"
          >
            {list.map((item: any, i: any) => (
              <div className="border-b" key={i}>
                <ListItem
                  alert={item}
                  onClear={() => onClear(item)}
                  loading={markingAsRead}
                />
              </div>
            ))}
          </NoContent>
        </Loader>
      </div>
    </div>
  );
}

export default observer(AlertTriggersModal);
