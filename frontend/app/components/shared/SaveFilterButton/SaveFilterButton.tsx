import React, { useState } from 'react';
import { connect } from 'react-redux';
import { save } from 'Duck/filters';
import { IconButton } from 'UI';
import SaveSearchModal from 'Shared/SaveSearchModal'

interface Props {
  filter: any;
  savedSearch: any;
}

function SaveFilterButton(props: Props) {
  const { savedSearch } = props;
  const [showModal, setshowModal] = useState(false)
  return (
    <div>
      { savedSearch.exists() ? (
        <IconButton className="mr-2" onClick={() => setshowModal(true)} primaryText label="UPDATE SEARCH" icon="zoom-in" />
      ) : (
        <IconButton className="mr-2" onClick={() => setshowModal(true)} primaryText label="SAVE SEARCH" icon="zoom-in" />
      )}
      { showModal && ( <SaveSearchModal show={showModal} closeHandler={() => setshowModal(false)} /> )}
    </div>
  );
}

export default connect(state => ({
  filter: state.getIn([ 'search', 'instance' ]),
  savedSearch: state.getIn([ 'search', 'savedSearch' ]),
}), { save })(SaveFilterButton);