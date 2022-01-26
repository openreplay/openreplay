import React, { useState } from 'react';
import { connect } from 'react-redux';
import { save } from 'Duck/filters';
import { Button } from 'UI';
import SaveSearchModal from 'Shared/SaveSearchModal'

interface Props {
  filter: any;
}

function SaveFilterButton(props) {
  const [showModal, setshowModal] = useState(false)
  return (
    <div>
      <Button onClick={() => setshowModal(true)}>SAVE FILTER</Button>
      <SaveSearchModal
        show={showModal}
        closeHandler={() => setshowModal(false)}
      />
    </div>
  );
}

export default connect(state => ({
  filter: state.getIn([ 'filters', 'appliedFilter' ]),
}), { save })(SaveFilterButton);