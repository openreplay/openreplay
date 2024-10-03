import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Button } from 'UI';
import SaveSearchModal from 'Shared/SaveSearchModal';

interface Props {
  savedSearch: any;
}

function SaveFilterButton(props: Props) {
  const { savedSearch } = props;
  const [showModal, setshowModal] = useState(false);
  return (
    <div>
      <Button
        variant="text-primary"
        className="mr-2"
        onClick={() => setshowModal(true)}
        icon="zoom-in">
        {savedSearch.exists() ? 'UPDATE SEARCH' : 'SAVE SEARCH'}
      </Button>
      {showModal && (<SaveSearchModal show={showModal} closeHandler={() => setshowModal(false)} />)}
    </div>
  );
}

export default connect(state => ({
  savedSearch: state.getIn(['search', 'savedSearch'])
}))(SaveFilterButton);
