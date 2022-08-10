import React, { useState } from 'react';
import { Button } from 'UI';
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
        <Button
            variant="text-primary"
            icon="funnel"
            onClick={handleClick}
        >SAVE FUNNEL</Button>

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