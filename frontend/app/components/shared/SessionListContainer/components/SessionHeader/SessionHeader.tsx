import React from 'react';
import { numberWithCommas } from 'App/utils';
import { applyFilter } from 'Duck/search';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import { connect } from 'react-redux';
import SessionSort from '../SessionSort';
import cn from 'classnames';
import { setActiveTab } from 'Duck/search';
import SessionSettingButton from '../SessionSettingButton';

interface Props {
    listCount: number;
    filter: any;
    isBookmark: any;
    isEnterprise: boolean;
    applyFilter: (filter: any) => void;
    setActiveTab: (tab: any) => void;
}
function SessionHeader(props: Props) {
    const {
        filter: { startDate, endDate, rangeValue },
        isBookmark,
        isEnterprise,
    } = props;

    const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });

    const onDateChange = (e: any) => {
        const dateValues = e.toJSON();
        props.applyFilter(dateValues);
    };

    return (
        <div className="flex items-center px-4 justify-between">
            <div className="flex items-center justify-between">
                <div className="mr-3 text-lg flex items-center">
                    <div
                        className={cn('py-3 cursor-pointer mr-4', {
                            'border-b color-teal border-teal': !isBookmark,
                        })}
                        onClick={() => props.setActiveTab({ type: 'all' })}
                    >
                        <span className="font-bold">SESSIONS</span>
                    </div>
                    <div
                        className={cn('py-3 cursor-pointer', {
                            'border-b color-teal border-teal': isBookmark,
                        })}
                        onClick={() => props.setActiveTab({ type: 'bookmark' })}
                    >
                        <span className="font-bold">{`${isEnterprise ? 'VAULT' : 'BOOKMARKS'}`}</span>
                    </div>
                </div>
            </div>

            {!isBookmark && <div className="flex items-center">
                <SessionTags />
                <div className="mx-4" />
                <SelectDateRange period={period} onChange={onDateChange} right={true} />
                <div className="mx-2" />
                <SessionSort />
                <SessionSettingButton />
            </div>}
        </div>
    );
}

export default connect(
    (state: any) => ({
        filter: state.getIn(['search', 'instance']),
        listCount: numberWithCommas(state.getIn(['sessions', 'total'])),
        isBookmark: state.getIn(['search', 'activeTab', 'type']) === 'bookmark',
        isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    }),
    { applyFilter, setActiveTab }
)(SessionHeader);
