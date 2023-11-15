import React, { useEffect } from 'react';
import { PageTitle, Icon, Button } from 'UI';
import AuditList from '../AuditList';
import AuditSearchField from '../AuditSearchField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';
import { numberWithCommas } from 'App/utils';
import withPageTitle from 'HOCs/withPageTitle';

function AuditView() {
    const { auditStore } = useStore();
    const order = useObserver(() => auditStore.order);
    const total = useObserver(() => numberWithCommas(auditStore.total));

    useEffect(() => {
        return () => {
            auditStore.updateKey('searchQuery', '');
        }
    }, [])

    const exportToCsv = () => {
        auditStore.exportToCsv();
    }

    const onChange = (data) => {
        auditStore.setDateRange(data);
    }

    return useObserver(() => (
        <div className="bg-white rounded-lg">
            <div className="flex items-center mb-4 px-5 pt-5">
                <PageTitle title={
                    <div className="flex items-center">
                        <span>Audit Trail</span>
                        <span className="color-gray-medium ml-2">{total}</span>
                    </div>
                } />
                <div className="flex items-center ml-auto">
                    <div className="mx-2">
                        <SelectDateRange
                            period={auditStore.period}
                            onChange={onChange}
                            right={true}
                        />
                    </div>
                    <div className="mx-2">
                        <Select
                            options={[
                                { label: 'Newest First', value: 'desc' },
                                { label: 'Oldest First', value: 'asc' },
                            ]}
                            defaultValue={order}
                            plain
                            onChange={({ value }) => auditStore.updateKey('order', value.value)}
                        />
                    </div>
                    <AuditSearchField onChange={(value) => {
                        auditStore.updateKey('searchQuery', value);
                        auditStore.updateKey('page', 1)
                    } }/>
                    <div>
                        <Button variant="text-primary" className="ml-3" onClick={exportToCsv}>
                            <Icon name="grid-3x3" color="teal" />
                            <span className="ml-2">Export to CSV</span>
                        </Button>
                    </div>
                </div>
            </div>

            <AuditList />
        </div>
    ));
}

export default withPageTitle('Audit Trail - OpenReplay Preferences')(AuditView);