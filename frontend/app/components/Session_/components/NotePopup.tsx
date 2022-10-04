import React from 'react'
import { Icon } from 'UI'
import { connectPlayer, pause } from 'Player';
import { connect } from 'react-redux'
import { setCreateNoteTooltip } from 'Duck/sessions';

function NotePopup({ setCreateNoteTooltip, time }: { setCreateNoteTooltip: (args: any) => void,  time: number }) {
  const toggleNotePopup = () => {
    pause();
    setCreateNoteTooltip({ time: time, isVisible: true })
  };

  React.useEffect(() => {
    return () => setCreateNoteTooltip({ time: -1, isVisible: false })
  })
  return (
    <div
      onClick={toggleNotePopup}
      className="cursor-pointer mr-4 hover:bg-gray-light-shade rounded-md p-1 flex items-center"
    >
      <Icon name="quotes" size="16" className="mr-2" />
      Add note
    </div>
  )
}


const NotePopupPl = connectPlayer(
  // @ts-ignore
  (state) => ({ time: state.time })
)(React.memo(NotePopup));

const NotePopupComp = connect(
  null, { setCreateNoteTooltip }
)(NotePopupPl)

export default React.memo(NotePopupComp)
