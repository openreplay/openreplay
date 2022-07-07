import React from 'react';
import { connect } from 'react-redux';
import SortDropdown from '../Filters/SortDropdown';
import { numberWithCommas } from 'App/utils';
import SelectDateRange from 'Shared/SelectDateRange';
import { applyFilter } from 'Duck/search';
import Period from 'Types/app/period';

const sortOptionsMap = {
    'startTs-desc': 'Newest',
    'startTs-asc': 'Oldest',
    'eventsCount-asc': 'Events Ascending',
    'eventsCount-desc': 'Events Descending',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({ value, label }));

function SessionListHeader({ activeTab, count, applyFilter, filter }) {
    const { startDate, endDate, rangeValue } = filter;
    const period = new Period({ start: startDate, end: endDate, rangeName: rangeValue });

    const onDateChange = (e) => {
        const dateValues = e.toJSON();
        applyFilter(dateValues);
    };
    return (
        <div className="flex mb-2 justify-between items-end">
            <div className="flex items-baseline">
                <h3 className="text-2xl capitalize">
                    <span>{activeTab.name}</span>
                    <span className="ml-2 font-normal color-gray-medium">{count ? numberWithCommas(count) : 0}</span>
                </h3>
                {
                    <div className="ml-3 flex items-center">
                        <span className="mr-2 color-gray-medium">Sessions Captured in</span>
                        <SelectDateRange period={period} onChange={onDateChange} />
                    </div>
                }
            </div>
            <div className="flex items-center">
                <div className="flex items-center ml-6">
                    <span className="mr-2 color-gray-medium">Sort By</span>
                    <SortDropdown options={sortOptions} />
                </div>
            </div>
        </div>
    );
}

export default connect(
    (state) => ({
        activeTab: state.getIn(['search', 'activeTab']),
        period: state.getIn(['search', 'period']),
        filter: state.getIn(['search', 'instance']),
    }),
    { applyFilter }
)(SessionListHeader);
