import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Loader, Pagination, NoContent } from 'UI';
import AuditDetailModal from '../AuditDetailModal';
import AuditListItem from '../AuditListItem';

interface Props {

}
function AuditList(props: Props) {
    const { auditStore } = useStore();
    const loading = useObserver(() => auditStore.isLoading);
    const list = useObserver(() => auditStore.list);
    const searchQuery = useObserver(() => auditStore.searchQuery);
    const page = useObserver(() => auditStore.page);
    const order = useObserver(() => auditStore.order);
    const period = useObserver(() => auditStore.period);
    const { showModal } = useModal();
    
    useEffect(() => {
        const { startTimestamp, endTimestamp } = period.toTimestamps();
        auditStore.fetchAudits({
            page: auditStore.page,
            limit: auditStore.pageSize,
            query: auditStore.searchQuery,
            order: auditStore.order,
            startDate: startTimestamp,
            endDate: endTimestamp,
        });
    }, [page, searchQuery, order, period]);

    return useObserver(() => (
        <Loader loading={loading}>
            <NoContent show={list.length === 0} animatedIcon="empty-state">
                <div className="px-2 grid grid-cols-12 gap-4 items-center py-3 font-medium">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-4">Status</div>
                    <div className="col-span-3">Time</div>
                </div>

                {list.map((item, index) => (
                    <div className="px-2 border-t hover:bg-active-blue" key={index}>
                        <AuditListItem
                            audit={item}
                            onShowDetails={() => showModal(<AuditDetailModal audit={item} />, { right: true })}
                        />
                    </div>
                ))}
                
                <div className="w-full flex items-center justify-center py-10">
                    <Pagination
                        page={auditStore.page}
                        totalPages={Math.ceil(auditStore.total / auditStore.pageSize)}
                        onPageChange={(page) => auditStore.updateKey('page', page)}
                        limit={auditStore.pageSize}
                        debounceRequest={200}
                    />
                </div>
            </NoContent>
        </Loader>
    ));
}

export default AuditList;