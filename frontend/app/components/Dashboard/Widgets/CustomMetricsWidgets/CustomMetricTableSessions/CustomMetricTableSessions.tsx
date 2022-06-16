import { useObserver } from 'mobx-react-lite';
import React from 'react';
import SessionItem from 'Shared/SessionItem';
import { Pagination } from 'UI';
import { useStore } from 'App/mstore';

const PER_PAGE = 10;
interface Props {
    data: any
    metric?: any
    isTemplate?: boolean;
    isEdit?: boolean;
}

function CustomMetricTableSessions(props: Props) {
    const { data = { sessions: [], total: 0 }, isEdit = false } = props;
    const currentPage = 1;
    const { metricStore } = useStore();
    const metric: any = useObserver(() => metricStore.instance);
    
    return (
        <div>
            {data.sessions && data.sessions.map((session: any, index: any) => (
                <SessionItem session={session} />
            ))}
            
            {isEdit && (
                <div className="my-6 flex items-center justify-center">
                    <Pagination
                        page={currentPage}
                        totalPages={Math.ceil(data.total / PER_PAGE)}
                        onPageChange={(page: any) => metric.updateKey('page', page)}
                        limit={PER_PAGE}
                        debounceRequest={500}
                    />
                </div>
            )}

            {!isEdit && (
                <ViewMore total={data.total} />
            )}
        </div>
    );
}

export default CustomMetricTableSessions;

const ViewMore = ({ total }: any) => total > PER_PAGE && (
    <div className="my-4 flex items-center justify-center cursor-pointer w-fit mx-auto">
        <div className="text-center">
            <div className="color-teal text-lg">
                All <span className="font-medium">{total}</span> sessions
            </div>
        </div>
    </div>
);