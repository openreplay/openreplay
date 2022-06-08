import React from 'react';
import { Button, NoContent } from 'UI';
import { connect } from 'react-redux';
import { fetchList, setLastRead } from 'Duck/announcements';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import ListItem from './ListItem'

interface Props {
    unReadNotificationsCount: number;
    setLastRead: Function;
    list: any;
}
function AnnouncementModal(props: Props) {
    const { list, unReadNotificationsCount } = props;

    // const onClear = (notification: any) => {
    //     console.log('onClear', notification);
    //     props.setViewed(notification.notificationId)
    // }

    return (
        <div className="bg-white box-shadow h-screen overflow-y-auto" style={{ width: '450px'}}>
            <div className="flex items-center justify-between p-5 text-2xl">
                <div>Announcements</div>
            </div>

            <div className="pb-5">
                <NoContent
                    title={
                        <div className="flex items-center justify-between">
                            <AnimatedSVG name={ICONS.EMPTY_STATE} size="100" />
                        </div>
                    }
                    subtext="There are no alerts to show."
                    // show={ !loading && unReadNotificationsCount === 0 }
                    size="small"
                >
                    {list.map((item: any, i: any) => (
                        <div className="border-b" key={i}>
                            {/* <ListItem alert={item} onClear={() => onClear(item)} loading={false} /> */}
                        </div>
                    ))}
                </NoContent>
            </div>
        </div>
    );
}

export default connect((state: any) => ({
    list: state.getIn(['announcements', 'list']),
}), {
    fetchList,
    setLastRead,
})(AnnouncementModal);