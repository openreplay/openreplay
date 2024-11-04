import React, { useEffect } from 'react';
import { Icon, Input } from 'UI';
import { debounce } from 'App/utils';

let debounceUpdate: any = () => {}
interface Props {
    onChange: (value: string) => void;
}
function SiteSearch(props: Props) {
    const { onChange } = props;
    
    useEffect(() => {
        debounceUpdate = debounce((value) => onChange(value), 500);
    }, [])

    const write = ({ target: { name, value } }) => {
        debounceUpdate(value);
    }

    return (
        <div className="relative" style={{ width: '300px'}}>
            <Icon name="search" className="absolute top-0 bottom-0 ml-3 m-auto" size="16" />
            <Input
                // value={query}
                name="searchQuery"
                // className="bg-white p-2 border border-gray-light rounded w-full pl-10"
                placeholder="Filter by name"
                onChange={write}
                icon="search"
            />
        </div>
    );
}

export default SiteSearch;