import React, { useState } from 'react';
import { IconButton } from 'UI';
import FunnelSaveModal from 'Components/Funnels/FunnelSaveModal';

export default function SaveFunnelButton() {
  const [showModal, setshowModal] = useState(false)
  return (
    <div>
        <IconButton
            className="mr-2"
            onClick={() => setshowModal(true)} primaryText label="SAVE FUNNEL" icon="zoom-in"
        />

        <FunnelSaveModal
            show={showModal}
            closeHandler={() => setshowModal(false)}
        />
    </div>
  )
}
