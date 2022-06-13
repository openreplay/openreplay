import { useStore } from 'App/mstore';
import React from 'react';
import Select from 'Shared/Select';
  
const sortOptions = [
    { value: 'afectedUsers-desc', label: 'Affected Users (High)' },
    { value: 'afectedUsers-asc', label: 'Affected Users (Low)' },
    { value: 'conversionImpact-desc', label: 'Conversion Impact (High)' },
    { value: 'conversionImpact-asc', label: 'Conversion Impact (Low)' },
    { value: 'lostConversions-desc', label: 'Lost Conversions (High)' },
    { value: 'lostConversions-asc', label: 'Lost Conversions (Low)' },
]

interface Props {
    // onChange?: (value: string) => void;
}
function FunnelIssuesSort(props: Props) {
    const { funnelStore } = useStore();
    
    const onSortChange = (opt: any) => {
        const [ sort, order ] = opt.value.value.split('-');
        funnelStore.updateKey('issuesSort', { sort, order });
    }

    return (
        <div>
            <Select
                plain
                defaultValue={sortOptions[0].value}
                options={sortOptions}
                alignRight={true}
                onChange={onSortChange}
            />
        </div>
    );
}

export default FunnelIssuesSort;