import React from 'react';
import { connect } from 'react-redux';
import { updateCurrentPage } from 'Duck/search';
import { numberWithCommas } from 'App/utils'

interface Props {
  latestSessions: any;
  updateCurrentPage: (page: number) => void;
}
function LatestSessionsMessage(props: Props) {
  const { latestSessions = [] } = props;
  const count = latestSessions.length;
  return count > 0 ? (
    <div
      className="bg-amber-50 p-1 flex w-full border-b text-center justify-center link"
      style={{ backgroundColor: 'rgb(255 251 235)' }}
      onClick={() => props.updateCurrentPage(1)}
    >
      Show {numberWithCommas(count)} New {count > 1 ? 'Sessions' : 'Session'}
    </div>
  ) : (
    <></>
  );
}

export default connect(
  (state: any) => ({
    latestSessions: state.getIn(['search', 'latestList']),
  }),
  { updateCurrentPage }
)(LatestSessionsMessage);
