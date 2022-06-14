import React from 'react';
import SessionItem from 'Shared/SessionItem';

interface Props {
    data: any
    metric?: any
    isTemplate?: boolean;
}

function CustomMetricTableSessions(props: Props) {
    const { data = { sessions: [] }, metric = {}, isTemplate } = props;
    console.log('data', data)
    return (
        <div>
            {data.sessions && data.sessions.map((session: any, index: any) => (
                <SessionItem session={session} />
            ))}
        </div>
    );
}

export default CustomMetricTableSessions;