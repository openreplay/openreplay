import React from 'react';
import { Button } from 'UI';
import { connectPlayer, pause } from 'Player';
import { connect } from 'react-redux';
import { setCreateNoteTooltip } from 'Duck/sessions';
import GuidePopup, { FEATURE_KEYS } from 'Shared/GuidePopup';

function NotePopup({
  setCreateNoteTooltip,
  time,
  tooltipActive,
}: {
  setCreateNoteTooltip: (args: any) => void;
  time: number;
  tooltipActive: boolean;
}) {
  const toggleNotePopup = () => {
    if (tooltipActive) return;
    pause();
    setCreateNoteTooltip({ time: time, isVisible: true });
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

const NotePopupPl = connectPlayer(
  // @ts-ignore
  (state) => ({ time: state.time })
)(React.memo(NotePopup));

const NotePopupComp = connect(
  (state: any) => ({ tooltipActive: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']) }),
  { setCreateNoteTooltip }
)(NotePopupPl);

export default React.memo(NotePopupComp);
