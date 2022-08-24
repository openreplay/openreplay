import { useObserver } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { Icon, Input } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {}
function UserSearch(props) {
    const { userStore } = useStore();
    const [query, setQuery] = useState(userStore.searchQuery);

    useEffect(() => {
        debounceUpdate = debounce((key, value) => userStore.updateKey(key, value), 500);
    }, [])

    const write = ({ target: { name, value } }) => {
        setQuery(value);
        debounceUpdate(name, value);
    }
    
    return useObserver(() => (
        <div className="relative" style={{ width: '300px'}}>
            <Icon name="search" className="absolute top-0 bottom-0 ml-3 m-auto" size="16" />
            <Input
                value={query}
                name="searchQuery"
                // className="bg-white p-2 border border-gray-light rounded w-full pl-10"
                placeholder="Filter by name, role"
                onChange={write}
                icon="search"
            />
        </div>
    ));
}

export default UserSearch;