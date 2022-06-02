import React from 'react';
import { Button, NoContent } from 'UI';
import { connect } from 'react-redux';
import { fetchList, setViewed, clearAll } from 'Duck/notifications';
import { setLastRead } from 'Duck/announcements';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import ListItem from './ListItem'

interface Props {
    unReadNotificationsCount: number;
    setLastRead: Function;
    
    clearingAll: boolean;
    loading: boolean;
    clearing: boolean;
    
    list: any;
    clearAll: Function;
    setViewed: Function;
}
function AlertTriggersModal(props: Props) {
    const { list, unReadNotificationsCount, loading, clearingAll, clearing } = props;

    const onClearAll = () => {
        const { list } = props;
        const firstItem = list.first();
        props.clearAll({ endTimestamp: firstItem.createdAt.ts });
    }

    const onClear = (notification: any) => {
        console.log('onClear', notification);
        props.setViewed(notification.notificationId)
    }

    return (
        <div className="bg-white box-shadow h-screen overflow-y-auto" style={{ width: '450px'}}>
            <div className="flex items-center justify-between p-5 text-2xl">
                <div>Alerts</div>
                { unReadNotificationsCount > 0 && (
                    <div className="">
                        <Button
                            loading={clearingAll}
                            variant="text"
                            onClick={props.setLastRead}
                            disabled={unReadNotificationsCount === 0}
                        >
                            <span
                            className={ cn("text-sm color-gray-medium", { 'invisible' : clearingAll })}
                            onClick={onClearAll}>
                                IGNORE ALL
                            </span>
                        </Button>
                    </div>
                )}
            </div>

            <div className="pb-5">
                <NoContent
                    title={
                        <div className="flex items-center justify-between">
                            <AnimatedSVG name={ICONS.EMPTY_STATE} size="100" />
                        </div>
                    }
                    subtext="There are no alerts to show."
                    show={ !loading && unReadNotificationsCount === 0 }
                    size="small"
                >
                    {list.map((item: any, i: any) => (
                        <div className="border-b" key={i}>
                            <ListItem alert={item} onClear={() => onClear(item)} loading={false} />
                        </div>
                    ))}
                </NoContent>
            </div>
        </div>
    );
}

export default connect((state: any) => ({
    loading: state.getIn(['notifications', 'fetchRequest', 'loading']),
    clearing: state.getIn(['notifications', 'setViewed', 'loading']),
    clearingAll: state.getIn(['notifications', 'clearAll', 'loading']),
    list: state.getIn(['notifications', 'list']),
}), {
    fetchList,
    setLastRead,
    setViewed,
    clearAll,
})(AlertTriggersModal);