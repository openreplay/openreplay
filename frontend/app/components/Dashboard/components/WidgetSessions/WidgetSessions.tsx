import React from 'react';
import { NoContent } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { useObserver } from 'mobx-react-lite';
import { DateTime } from 'luxon';
interface Props {
    className?: string;
}
function WidgetSessions(props: Props) {
    const { className = '' } = props;
    const { dashboardStore } = useStore();
    const period = useObserver(() => dashboardStore.period);
    const widget = dashboardStore.currentWidget;

    const range = period.toTimestamps()
    const startTime = DateTime.fromMillis(range.startTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const endTime = DateTime.fromMillis(range.endTimestamp).toFormat('LLL dd, yyyy HH:mm a');

    return useObserver(() => (
        <div className={cn(className)}>
            <div className="flex items-baseline">
                <h2 className="text-2xl">Sessions</h2>
                <div className="ml-2 color-gray-medium">between <span className="font-medium color-gray-darkest">{startTime}</span> and <span className="font-medium color-gray-darkest">{endTime}</span> </div>
            </div>

            <div className="mt-3">
                <NoContent
                    title="No recordings found"
                    show={widget.sessions.length === 0}
                    animatedIcon="no-results"
                >
                    {widget.sessions.map((session: any) => (
                        <SessionItem key={ session.sessionId } session={ session }  />
                    ))}
                </NoContent>
            </div>
        </div>
    ));
}

export default WidgetSessions;