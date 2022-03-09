import React, { useState } from 'react';
import { IconButton } from 'UI';
import FunnelSaveModal from 'App/components/Funnels/FunnelSaveModal';
import { connect } from 'react-redux';
import { init } from 'Duck/funnels';
interface Props {
  filter: any
  init: (instance: any) => void
}
function SaveFunnelButton(props: Props) {
  const [showModal, setshowModal] = useState(false)

  const handleClick = () => {
    props.init({ filter: props.filter })
    setshowModal(true)
  }
  return (
    <div>
        <IconButton
            className="mr-2"
            onClick={handleClick} primaryText label="SAVE FUNNEL" icon="funnel"
        />

        <FunnelSaveModal
            show={showModal}
            closeHandler={() => setshowModal(false)}
        />
    </div>
  )
}

export default connect(state => ({
  filter: state.getIn(['search', 'instance']),
}), { init })(SaveFunnelButton);