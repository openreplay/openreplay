import React from 'react';
import { numberWithCommas } from 'App/utils';
import { applyFilter } from 'Duck/search';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import { connect } from 'react-redux';
import SessionSort from '../SessionSort';

interface Props {
    listCount: number;
    filter: any;
    applyFilter: (filter: any) => void;
}
function SessionHeader(props: Props) {
    const { listCount, filter: { startDate, endDate, rangeValue } } = props;
    const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });

    const onDateChange = (e: any) => {
        const dateValues = e.toJSON();
        props.applyFilter(dateValues);
    };

    return (
        <div className="flex items-center p-4 justify-between">
            <div className="flex items-center">
                <div className="mr-3 text-lg">
                    <span className="font-bold">Sessions</span> <span className="color-gray-medium ml-2">{listCount}</span>
                </div>
                <SessionTags />
            </div>

            <div className="flex items-center">
                <SelectDateRange period={period} onChange={onDateChange} right={true} />
                <div className="mx-2" />
                <SessionSort />
            </div>
        </div>
    );
}

export default connect(
    (state: any) => ({
        filter: state.getIn(['search', 'instance']),
        listCount: numberWithCommas(state.getIn(['sessions', 'total'])),
    }),
    { applyFilter }
)(SessionHeader);
