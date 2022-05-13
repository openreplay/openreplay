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
    onChange?: (value: string) => void;
}
function FunnelIssuesSort(props: Props) {
    return (
        <div>
            <Select
                plain
                defaultValue={sortOptions[0].value}
                options={sortOptions}
                alignRight={true}
                onChange={props.onChange}
            />
        </div>
    );
}

export default FunnelIssuesSort;