import React from 'react';
import { Button } from 'UI';
import { connect } from 'react-redux';
import { setCreateNoteTooltip } from 'Duck/sessions';
import { PlayerContext } from 'App/components/Session/playerContext';

function NotePopup({
  setCreateNoteTooltip,
  tooltipActive,
}: {
  setCreateNoteTooltip: (args: any) => void;
  tooltipActive: boolean;
}) {
  const { player, store } = React.useContext(PlayerContext);

  const toggleNotePopup = () => {
    if (tooltipActive) return;
    player.pause();
    setCreateNoteTooltip({ time: Math.round(store.get().time), isVisible: true });
  };

  React.useEffect(() => {
    return () => setCreateNoteTooltip({ time: -1, isVisible: false });
  }, []);

  return (
    <Button icon="quotes" variant="text" disabled={tooltipActive} onClick={toggleNotePopup}>
      Add Note
    </Button>
  );
}

const NotePopupComp = connect(
  (state: any) => ({ tooltipActive: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']) }),
  { setCreateNoteTooltip }
)(NotePopup);

export default React.memo(NotePopupComp);
