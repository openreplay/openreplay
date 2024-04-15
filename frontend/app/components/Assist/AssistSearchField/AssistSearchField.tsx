import React from 'react';
import { connect } from 'react-redux';

import {
  addFilterByKeyAndValue,
  clearSearch,
  edit as editFilter,
  fetchFilterSearch,
} from 'Duck/liveSearch';
import { Button } from 'UI';
import { useModal } from 'App/components/Modal';
import SessionSearchField from 'Shared/SessionSearchField';

import AssistStats from '../../AssistStats';
import Recordings from '../RecordingsList/Recordings'

interface Props {
  appliedFilter: any;
  fetchFilterSearch: any;
  addFilterByKeyAndValue: any;
  clearSearch: any;
}
function AssistSearchField(props: Props) {
  const hasEvents =
    props.appliedFilter.filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters =
    props.appliedFilter.filters.filter((i: any) => !i.isEvent).size > 0;
  const { showModal, hideModal } = useModal();

  const showStats = () => {
    showModal(<AssistStats />, { right: true, width: 960 })
  }
  const showRecords = () => {
    showModal(<Recordings />, { right: true, width: 960 })
  }
  return (
    <div className="flex items-center w-full gap-2">
      <div style={{ width: '60%' }}>
        <SessionSearchField />
      </div>
      <Button variant="outline" onClick={showRecords}>Training Videos</Button>
      <Button variant="outline" onClick={showStats}>Co-Browsing Reports</Button>
      <Button
        variant="text-primary"
        className="ml-auto font-medium"
        disabled={!hasFilters && !hasEvents}
        onClick={() => props.clearSearch()}
      >
        Clear Search
      </Button>
    </div>
  );
}

export default connect(
  (state: any) => ({
    appliedFilter: state.getIn(['liveSearch', 'instance']),
    isEnterprise:
      state.getIn(['user', 'account', 'edition']) === 'ee' ||
      state.getIn(['user', 'authDetails', 'edition']) === 'ee'
  }),
  {
    fetchFilterSearch,
    editFilter,
    addFilterByKeyAndValue,
    clearSearch,
  }
)(AssistSearchField);
