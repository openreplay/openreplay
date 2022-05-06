import React from 'react';
import { PageTitle } from 'UI';
import AuditList from '../AuditList';
import AuditSearchField from '../AuditSearchField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';

function AuditView(props) {
    const { auditStore } = useStore();
    const order = useObserver(() => auditStore.order);

    return useObserver(() => (
        <div>
            <div className="flex items-center mb-4">
                <PageTitle title="Audit" />
                <div className="flex items-center ml-auto">
                    <div className="mx-4">
                        {/* <SelectDateRange
                            startDate={auditStore.startDate}
                            endDate={auditStore.endDate}
                            range={auditStore.range}
                            onChange={auditStore.setDateRange}
                        /> */}
                    </div>
                    <div className="mx-4">
                        <Select
                            options={[
                                { label: 'Newest First', value: 'desc' },
                                { label: 'Oldest First', value: 'asc' },
                            ]}
                            defaultValue={order}
                            plain
                            onChange={({ value }) => auditStore.updateKey('order', value)}
                        />
                    </div>
                    <AuditSearchField onChange={(value) => auditStore.updateKey('searchQuery', value) }/>
                </div>
            </div>

            <AuditList />
        </div>
    ));
}

export default AuditView;