import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';

function MetricsSearch(props) {
    const { dashboardStore } = useStore();
    const metricsSearch = useObserver(() => dashboardStore.metricsSearch);

    
    return useObserver(() => (
        <div className="relative">
            <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="18" />
            <input
                value={metricsSearch}
                name="metricsSearch"
                className="bg-white p-2 border rounded w-full pl-10"
                placeholder="Filter by title, type, dashboard and owner"
                onChange={({ target: { name, value } }) => dashboardStore.updateKey(name, value)}
            />
        </div>
    ));
}

export default MetricsSearch;