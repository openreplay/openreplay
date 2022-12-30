import React from 'react';
import { connect } from 'react-redux';
import MetadataItem from './MetadataItem';

export default connect(state => ({
  metadata: state.getIn([ 'sessions', 'current' ]).metadata,
}))(function Metadata ({ metadata }) {

  const metaLenth = Object.keys(metadata).length;

  if (metaLenth === 0) {
    return (
      (<span className="text-sm color-gray-medium">Check <a href="https://docs.openreplay.com/installation/metadata" target="_blank" className="link">how to use Metadata</a> if you haven’t yet done so.</span>)
    )
  }
  return (
      <div>
        { Object.keys(metadata).map((key) => {
          // const key = Object.keys(i)[0]
          const value = metadata[key]
          return <MetadataItem item={ { value, key } } key={ key } />
        }) }
    </div>
  );
});
