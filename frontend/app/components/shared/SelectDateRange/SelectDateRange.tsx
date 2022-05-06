import React from 'react';
import { DATE_RANGE_OPTIONS } from 'App/dateRange'
import Select from 'Shared/Select';

interface Props {
    startDate: string;
    endDate: string;
    range: string;
    onChange: (startDate: string, endDate: string) => void;
}
function SelectDateRange(props: Props) {
    return (
        <div>
            <Select
                plain
                options={DATE_RANGE_OPTIONS}
            />
        </div>
    );
}

export default SelectDateRange;