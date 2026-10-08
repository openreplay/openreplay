import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DrawerHeader } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';

import './alert-triggers.css';

/** The nav bell's drawer: alerts that fired, newest first. */
function AlertTriggersModal() {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { notificationStore } = useStore();
  const count = notificationStore.notificationsCount;
  const list = notificationStore.notifications;
  const { loading, markingAsRead } = notificationStore;

  useEffect(() => {
    notificationStore.fetchNotifications();
  }, []);

  const onClearAll = () => {
    const first = list[0];
    if (!first) return;
    notificationStore.ignoreAllNotifications({
      endTimestamp: first.createdAt.ts,
    });
  };

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          title={t('Alerts')}
          meta={
            count > 0 ? t('{{count}} unread', { count: Number(count) }) : null
          }
          actions={
            count > 0 && (
              <Button variant="subtle" size="sm" onClick={onClearAll}>
                {t('Ignore all')}
              </Button>
            )
          }
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        {loading ? (
          <div className="px-6 py-5">
            <SkeletonRows rows={5} />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={t('No alerts')}
            hint={t('Alerts show up here when one of yours triggers.')}
          />
        ) : (
          <ul className="m-alog">
            {list.map((item: any) => (
              <li
                key={item.notificationId}
                className={`m-alog__item group${item.viewed ? ' is-read' : ''}`}
              >
                <div className="m-alog__top">
                  {!item.viewed && (
                    <span className="m-alog__dot" aria-hidden="true" />
                  )}
                  {item.options?.sourceMeta && (
                    <Chip>{item.options.sourceMeta}</Chip>
                  )}
                  {item.createdAt && (
                    <span className="m-alog__time">
                      <RelativeTime at={item.createdAt.toMillis()} />
                    </span>
                  )}
                  {!item.viewed && (
                    <Button
                      variant="subtle"
                      size="sm"
                      className="m-alog__ignore"
                      loading={markingAsRead}
                      onClick={() =>
                        notificationStore.ignoreNotification(
                          item.notificationId,
                        )
                      }
                    >
                      {t('Ignore')}
                    </Button>
                  )}
                </div>
                <p className="m-alog__title">{item.title}</p>
                {item.description && (
                  <p className="m-alog__desc">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default observer(AlertTriggersModal);
