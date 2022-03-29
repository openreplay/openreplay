import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { useDashboardStore } from '../../store/store';
import { Icon } from 'UI';

function MetricsSearch(props) {
    const store: any = useDashboardStore();
    const metricsSearch = useObserver(() => store.metricsSearch);

    
    return useObserver(() => (
        <div className="relative">
            <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="18" />
            <input
                value={metricsSearch}
                name="metricsSearch"
                className="bg-white p-2 border rounded w-full pl-10"
                placeholder="Filter by title, type, dashboard and owner"
                onChange={({ target: { name, value } }) => store.updateKey(name, value)}
            />
        </div>
    ));
}

export default MetricsSearch;