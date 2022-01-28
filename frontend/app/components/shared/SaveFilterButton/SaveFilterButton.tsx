import React, { useState } from 'react';
import { connect } from 'react-redux';
import { save } from 'Duck/filters';
import { IconButton } from 'UI';
import SaveSearchModal from 'Shared/SaveSearchModal'

interface Props {
  filter: any;
}

function SaveFilterButton(props: Props) {
  const [showModal, setshowModal] = useState(false)
  return (
    <div>
      {/* <Button onClick={() => setshowModal(true)}>SAVE FILTER</Button> */}
      <IconButton className="mr-2" onClick={() => setshowModal(true)} primaryText label="SAVE SEARCH" icon="zoom-in" />
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