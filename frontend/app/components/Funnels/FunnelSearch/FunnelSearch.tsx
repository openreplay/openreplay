import { useObserver } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {}
function FunnelSearch(props) {
    const { funnelStore } = useStore();
    const [query, setQuery] = useState(funnelStore.search);
    useEffect(() => {
        debounceUpdate = debounce((key, value) => funnelStore.updateKey(key, value), 500);
    }, [])

    const write = ({ target: { name, value } }) => {
        setQuery(value);
        debounceUpdate('metricsSearch', value);
    }
    
    return useObserver(() => (
        <div className="relative">
            <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
            <input
                value={query}
                name="metricsSearch"
                className="bg-white p-2 border rounded w-full pl-10"
                placeholder="Filter by title, owner"
                onChange={write}
            />
        </div>
    ));
}

export default FunnelSearch;