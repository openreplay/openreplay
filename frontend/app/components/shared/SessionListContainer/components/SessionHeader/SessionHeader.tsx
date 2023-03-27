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
    className={cn('py-3 cursor-pointer border-b', {
      'border-b color-teal border-teal': addBorder,
      'border-transparent': !addBorder,
    })}
    onClick={onClick}
  >
    {children}
  </div>
);

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
    <div className="flex items-center px-4 py-1 justify-between w-full">
      {activeTab !== 'notes' ? (
        <div className="flex items-center w-full justify-end">
          {activeTab !== 'bookmark' && (
            <>
              <SessionTags />
              <div className="mr-auto" />
              <SelectDateRange period={period} onChange={onDateChange} right={true} />
              <div className="mx-2" />
            </>
          )}
          <SessionSort />
          <SessionSettingButton />
        </div>
      ) : null}

      {activeTab === 'notes' && (
        <div className="flex items-center justify-end w-full">
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
