import React from 'react'
import { Icon } from 'UI'
import { connectPlayer, pause } from 'Player';
import { connect } from 'react-redux'
import { setNoteTooltip } from 'Duck/sessions';

function NotePopup({ setNoteTooltip, time }: { setNoteTooltip: (args: any) => void,  time: number }) {
  const toggleNotePopup = () => {
    pause();
    setNoteTooltip({ time: time, isVisible: true })
  };

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
  null, { setNoteTooltip }
)(NotePopupPl)

export default React.memo(NotePopupComp)
