import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import Filter from 'Types/filter';
import { filtersMap } from 'Types/filter/newFilter';
import { FilterKey } from 'App/types/filter/filterType';
import { NoContent, Pagination, Loader, Avatar } from 'UI';
import SessionItem from 'Shared/SessionItem';
import SelectDateRange from 'Shared/SelectDateRange';
import Period from 'Types/app/period';
import { useObserver, observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

const PER_PAGE = 10;
interface Props {
    userId: string;
    hash: string;
    name: string;
}
function UserSessionsModal(props: Props) {
    const { userId, hash, name } = props;
    const { sessionStore } = useStore();
    const { hideModal } = useModal();
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<any>({ sessions: [], total: 0 });
    const filter = useObserver(() => sessionStore.userFilter);

    const onDateChange = (period: any) => {
        filter.update('period', period);
    };

    const fetchData = () => {
        setLoading(true);
        sessionStore
            .getSessions(filter)
            .then(setData)
            .catch(() => {
                console.log('error');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        const userFilter = { key: FilterKey.USERID, value: [userId], operator: 'is', isEvent: false };
        filter.update('filters', [userFilter]);
    }, []);
    useEffect(fetchData, [filter.page, filter.startDate, filter.endDate]);

    return (
        <div className="h-screen overflow-y-auto bg-white" style={{ width: '700px' }}>
            <div className="flex items-center justify-between w-full px-5 py-3">
                <div className="text-lg flex items-center">
                    <Avatar isActive={false} seed={hash} isAssist={false} className={''} />
                    <div className="ml-3">
                        {name}'s <span className="color-gray-dark">Sessions</span>
                    </div>
                </div>
                <div>
                    <SelectDateRange period={filter.period} onChange={onDateChange} right={true} />
                </div>
            </div>

            <NoContent show={data.sessions.length === 0} title={
                <div>
                    <AnimatedSVG name={ICONS.NO_SESSIONS} size={170} />
                    <div className="mt-2" />
                    <div className="text-center text-gray-600">No recordings found.</div>
                </div>
            }>
                <div className="border rounded m-5">
                    <Loader loading={loading}>
                        {data.sessions.map((session: any) => (
                            <div className="border-b last:border-none">
                                <SessionItem key={session.sessionId} session={session} compact={true} onClick={hideModal} />
                            </div>
                        ))}
                    </Loader>

                    <div className="flex items-center justify-between p-5">
                        <div>
                            {/* showing x to x of total sessions  */}
                            Showing <span className="font-medium">{(filter.page - 1) * PER_PAGE + 1}</span> to{' '}
                            <span className="font-medium">{(filter.page - 1) * PER_PAGE + data.sessions.length}</span> of{' '}
                            <span className="font-medium">{data.total}</span> sessions.
                        </div>
                        <Pagination
                            page={filter.page}
                            totalPages={Math.ceil(data.total / PER_PAGE)}
                            onPageChange={(page) => filter.update('page', page)}
                            limit={PER_PAGE}
                            debounceRequest={1000}
                        />
                    </div>
                </div>
            </NoContent>
        </div>
    );
}

export default observer(UserSessionsModal);
