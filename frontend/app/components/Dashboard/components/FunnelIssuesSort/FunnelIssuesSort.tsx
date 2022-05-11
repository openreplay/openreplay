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
function FunnelIssuesSort(props) {
    return (
        <div>
            <Select
                plain
                options={sortOptions}
            />
        </div>
    );
}

export default FunnelIssuesSort;