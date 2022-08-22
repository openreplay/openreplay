import React, { useEffect } from 'react';
import { Button, NoContent, Loader } from 'UI';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import ListItem from './ListItem'
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props {
    
}
function AlertTriggersModal(props: Props) {
    const { notificationStore } = useStore();
    const count = useObserver(() => notificationStore.notificationsCount);
    const list = useObserver(() => notificationStore.notifications);
    const loading = useObserver(() => notificationStore.loading);
    const markingAsRead = useObserver(() => notificationStore.markingAsRead);

    const onClearAll = () => {
        const firstItem = list[0];
        if (!firstItem) return;
        notificationStore.ignoreAllNotifications({ endTimestamp: firstItem.createdAt.ts });
    }

    const onClear = (notification: any) => {
        notificationStore.ignoreNotification(notification.notificationId);
    }

    useEffect(() => {
        notificationStore.fetchNotifications();
    }, [])

    return useObserver(() => (
        <div className="bg-white box-shadow h-screen overflow-y-auto" style={{ width: '450px'}}>
            <div className="flex items-center justify-between p-5 text-2xl">
                <div>Alerts</div>
                { count > 0 && (
                    <div className="">
                        <Button
                            // loading={loading} // TODO should use the different loading state for this
                            variant="text"
                            onClick={onClearAll}
                            disabled={count === 0}
                        >
                            <span className={ cn("text-sm color-gray-medium")} >
                                IGNORE ALL
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
                        subtext="There are no alerts to show."
                        show={ !loading && list.length === 0 }
                        size="small"
                    >
                        {list.map((item: any, i: any) => (
                            <div className="border-b" key={i}>
                                <ListItem alert={item} onClear={() => onClear(item)} loading={markingAsRead} />
                            </div>
                        ))}
                    </NoContent>
                </Loader>
            </div>
        </div>
    ));
}

export default AlertTriggersModal;