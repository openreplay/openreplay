import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {}

function DashboardSearch() {
    const { dashboardStore } = useStore();
    const [query, setQuery] = useState(dashboardStore.dashboardsSearch);
    useEffect(() => {
        debounceUpdate = debounce((key: string, value: any) => dashboardStore.updateKey(key, value), 500);
    }, [])

    // @ts-ignore
    const write = ({ target: { value } }) => {
        setQuery(value);
        debounceUpdate('dashboardsSearch', value);
    }
    
    return (
        <div className="relative">
            <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
            <input
                value={query}
                name="dashboardsSearch"
                className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
                placeholder="Filter by title or description"
                onChange={write}
            />
        </div>
    );
}

export default observer(DashboardSearch);
