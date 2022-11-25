import React from 'react';
import { Button } from 'UI';
import { connect } from 'react-redux';
import { setCreateNoteTooltip } from 'Duck/sessions';
import GuidePopup from 'Shared/GuidePopup';
import { PlayerContext } from 'App/components/Session/playerContext';

function NotePopup({
  setCreateNoteTooltip,
  tooltipActive,
}: {
  setCreateNoteTooltip: (args: any) => void;
  tooltipActive: boolean;
}) {
  const { player, store } = React.useContext(PlayerContext)

  const toggleNotePopup = () => {
    if (tooltipActive) return;
    player.pause();
    setCreateNoteTooltip({ time: store.get().time, isVisible: true });
  };

  React.useEffect(() => {
    return () => setCreateNoteTooltip({ time: -1, isVisible: false });
  }, []);

  return (
    <GuidePopup
      title="Introducing Notes"
      description={'Annotate session replays and share your feedback with the rest of your team.'}
    >
      <Button icon="quotes" variant="text" disabled={tooltipActive} onClick={toggleNotePopup}>
        Add Note
      </Button>
    </GuidePopup>
  );
}

const NotePopupComp = connect(
  (state: any) => ({ tooltipActive: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']) }),
  { setCreateNoteTooltip }
)(NotePopup);

export default React.memo(NotePopupComp);
