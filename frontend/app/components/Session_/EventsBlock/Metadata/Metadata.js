import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { NoContent, IconButton } from 'UI';
import withToggle from 'HOCs/withToggle';
import MetadataItem from './MetadataItem';
import stl from './metadata.css';

export default connect(state => ({
  metadata: state.getIn([ 'sessions', 'current', 'metadata' ]),
}))(function Metadata ({ metadata }) {
  const [ visible, setVisible ] = useState(false);
  const toggle = useCallback(() => setVisible(v => !v), []);
  return (
    <>
      <IconButton
        className="w-full"
        onClick={ toggle }
        icon="id-card"
        plain
        label="Metadata"
        primaryText
        active={ visible }
        disabled={metadata.length === 0}
        id="metadata-button"
      />
      { visible && 
        <div className={ stl.modal } >
          <NoContent show={ metadata.size === 0 } size="small" >
            { metadata.map((i) => {
              const key = Object.keys(i)[0]
              const value = i[key]
              return <MetadataItem item={ { value, key } } key={ key } />
            }) }
          </NoContent>
        </div>
      }
    </>
  );
});
