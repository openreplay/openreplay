import React from 'react';
import { numberWithCommas } from 'App/utils';
import { applyFilter } from 'Duck/search';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import NoteTags from '../Notes/NoteTags';
import { connect } from 'react-redux';
import SessionSort from '../SessionSort';
import cn from 'classnames';
import { setActiveTab } from 'Duck/search';
import SessionSettingButton from '../SessionSettingButton';

// @ts-ignore
const Tab = ({ addBorder, onClick, children }) => (
    <div
        className={cn('py-3 cursor-pointer', {
            'border-b color-teal border-teal': addBorder,
        })}
        onClick={onClick}
    >
        {children}
    </div>
)

interface Props {
    listCount: number;
    filter: any;
    activeTab: string;
    isEnterprise: boolean;
    applyFilter: (filter: any) => void;
    setActiveTab: (tab: any) => void;
}
function SessionHeader(props: Props) {
    const {
        filter: { startDate, endDate, rangeValue },
        activeTab,
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
                <div className="mr-3 text-lg flex items-center gap-4">
                    <Tab
                        onClick={() => props.setActiveTab({ type: 'all' })}
                        addBorder={activeTab === 'all'}
                    >
                        <span className="font-bold">SESSIONS</span>
                    </Tab>
                    <Tab
                        onClick={() => props.setActiveTab({ type: 'bookmark' })}
                        addBorder={activeTab === 'bookmark'}
                    >
                        <span className="font-bold">{`${isEnterprise ? 'VAULT' : 'BOOKMARKS'}`}</span>
                    </Tab>
                    <Tab
                        addBorder={activeTab === 'notes'}
                        onClick={() => props.setActiveTab({ type: 'notes' })}
                    >
                        <span className="font-bold">NOTES</span>
                    </Tab>
                </div>
            </div>

            {activeTab !== 'notes' && activeTab !== 'bookmark' ? (
                <div className="flex items-center">
                    <SessionTags />
                    <div className="mx-4" />
                    <SelectDateRange period={period} onChange={onDateChange} right={true} />
                    <div className="mx-2" />
                    <SessionSort />
                    <SessionSettingButton />
                </div>
            ) : null}
            {activeTab === 'notes' && (
                <div className="flex items-center">
                    <NoteTags />
                </div>
            )}
        </div>
    );
}

export default connect(
    (state: any) => ({
        filter: state.getIn(['search', 'instance']),
        listCount: numberWithCommas(state.getIn(['sessions', 'total'])),
        activeTab: state.getIn(['search', 'activeTab', 'type']),
        isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    }),
    { applyFilter, setActiveTab }
)(SessionHeader);
