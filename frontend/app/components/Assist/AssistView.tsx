import React from 'react';
import LiveSessionList from 'Shared/LiveSessionList';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import AssistSearchField from './AssistSearchField';
import { connect } from 'react-redux';
import { fetchListActive as fetchMetadata } from 'Duck/customField';

interface Props {
  fetchMetadata: () => void;
}

function AssistView(props: Props) {
  React.useEffect(() => {
    props.fetchMetadata();
  }, []);

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1300px'}}>
      <AssistSearchField />
      <LiveSessionSearch />
      <div className="my-4" />
      <LiveSessionList />
    </div>
  )
}

export default connect(null, { fetchMetadata })(AssistView);
