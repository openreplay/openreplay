import React from 'react';
import { IconButton } from 'UI';
import { connect } from 'react-redux';
import { edit, init } from 'Duck/customMetrics';

interface Props {
  init: (instance?, setDefault?) => void;
}
function CustomMetrics(props: Props) {
  return (
    <div className="self-start">
      <IconButton plain outline icon="plus" label="CREATE METRIC" onClick={() => props.init()} />
    </div>
  );
}

export default connect(null, { edit, init })(CustomMetrics);