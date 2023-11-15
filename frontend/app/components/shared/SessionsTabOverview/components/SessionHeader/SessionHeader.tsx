import React, { useMemo } from 'react';
import { applyFilter } from 'Duck/search';
import Period from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange';
import SessionTags from '../SessionTags';
import NoteTags from '../Notes/NoteTags';
import { connect } from 'react-redux';
import SessionSort from '../SessionSort';
import { setActiveTab } from 'Duck/search';

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
    listCount
  } = props;

  const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });

  const title = useMemo(() => {
    if (activeTab === 'notes') {
      return 'Notes';
    }
    if (activeTab === 'bookmark') {
      return isEnterprise ? 'Vault' : 'Bookmarks';
    }
    return 'Sessions';
  }, [activeTab]);

  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    props.applyFilter(dateValues);
  };

  return (
    <div className='flex items-center px-4 py-1 justify-between w-full'>
      <h2 className='text-2xl capitalize mr-4'>{title}</h2>
      {activeTab !== 'notes' ? (
        <div className='flex items-center w-full justify-end'>
          {activeTab !== 'bookmark' && (
            <>
              <SessionTags />
              <div className='mr-auto' />
              <SelectDateRange period={period} onChange={onDateChange} right={true} />
              <div className='mx-2' />
            </>
          )}
          <SessionSort />
        </div>
      ) : null}

      {activeTab === 'notes' && (
        <div className='flex items-center justify-end w-full'>
          <NoteTags />
        </div>
      )}
    </div>
  );
}

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
    listCount: state.getIn(['sessions', 'total']),
    activeTab: state.getIn(['search', 'activeTab', 'type']),
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee'
  }),
  { applyFilter, setActiveTab }
)(SessionHeader);
