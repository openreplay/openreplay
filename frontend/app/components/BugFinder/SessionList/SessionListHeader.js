import React from 'react';
import { connect } from 'react-redux';
import SortDropdown from '../Filters/SortDropdown';
import { numberWithCommas } from 'App/utils';
import SelectDateRange from 'Shared/SelectDateRange';
import { applyFilter } from 'Duck/search';
import Record from 'Types/app/period';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { moment } from 'App/dateRange';

const sortOptionsMap = {
    'startTs-desc': 'Newest',
    'startTs-asc': 'Oldest',
    'eventsCount-asc': 'Events Ascending',
    'eventsCount-desc': 'Events Descending',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({ value, label }));

function SessionListHeader({ activeTab, count, applyFilter, filter }) {
    const { settingsStore } = useStore();

    const label = useObserver(() => settingsStore.sessionSettings.timezone.label);
    const getTimeZoneOffset = React.useCallback(() => {
        return label.slice(-6);
    }, [label]);

    const { startDate, endDate, rangeValue } = filter;
    const period = new Record({ start: startDate, end: endDate, rangeName: rangeValue, timezoneOffset: getTimeZoneOffset() });

    const onDateChange = (e) => {
        const dateValues = e.toJSON();
        dateValues.startDate = moment(dateValues.startDate).utcOffset(getTimeZoneOffset(), true).valueOf();
        dateValues.endDate = moment(dateValues.endDate).utcOffset(getTimeZoneOffset(), true).valueOf();
        applyFilter(dateValues);
    };

    React.useEffect(() => {
        if (label) {
            const dateValues = period.toJSON();
            dateValues.startDate = moment(dateValues.startDate).startOf('day').utcOffset(getTimeZoneOffset(), true).valueOf();
            dateValues.endDate = moment(dateValues.endDate).endOf('day').utcOffset(getTimeZoneOffset(), true).valueOf();
            // applyFilter(dateValues);
        }
    }, [label]);

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
                        <SelectDateRange period={period} onChange={onDateChange} timezone={getTimeZoneOffset()} />
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
