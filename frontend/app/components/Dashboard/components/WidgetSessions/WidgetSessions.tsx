import React from 'react';
import { NoContent } from 'UI';
import cn from 'classnames';
import { useDashboardStore } from '../../store/store';
import SessionItem from 'Shared/SessionItem';

interface Props {
    className?: string;
}
function WidgetSessions(props: Props) {
    const { className = '' } = props;
    const store: any = useDashboardStore();
    const widget = store.currentWidget;

    return (
        <div className={cn(className)}>
            <div>
                <h2 className="text-2xl">Sessions</h2>
                {/* <div className="mr-auto">Showing all sessions between <span className="font-medium">{startTime}</span> and <span className="font-medium">{endTime}</span> </div> */}
            </div>

            <div className="mt-3">
                <NoContent
                    title="No recordings found"
                    show={widget.sessions.length === 0}
                    icon="exclamation-circle"
                >
                    {widget.sessions.map((session: any) => (
                        <SessionItem key={ session.sessionId } session={ session }  />
                    ))}
                </NoContent>
            </div>
        </div>
    );
}

export default WidgetSessions;