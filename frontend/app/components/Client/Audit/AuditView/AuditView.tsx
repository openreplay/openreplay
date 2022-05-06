import React from 'react';
import { PageTitle } from 'UI';
import AuditList from '../AuditList';
import AuditSearchField from '../AuditSearchField';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function AuditView(props) {
    const { auditStore } = useStore();
    return useObserver(() => (
        <div>
            <div className="flex items-center mb-4">
                <PageTitle title="Audit" />
                <div className="flex items-center ml-auto">
                    <AuditSearchField onChange={(value) => auditStore.updateKey('searchQuery', value) }/>
                </div>
            </div>

            <AuditList />
        </div>
    ));
}

export default AuditView;