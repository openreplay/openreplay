import React from 'react';
import { Button } from 'UI';
import { connect } from 'react-redux';
import { setCreateNoteTooltip } from 'Duck/sessions';
import GuidePopup from 'Shared/GuidePopup';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

function NotePopup({
  setCreateNoteTooltip,
  tooltipActive,
}: {
  setCreateNoteTooltip: (args: any) => void;
  tooltipActive: boolean;
}) {
  const { player, store } = React.useContext(PlayerContext)
  const { time } = store.get();

  const toggleNotePopup = () => {
    if (tooltipActive) return;
    player.pause();
    setCreateNoteTooltip({ time: time, isVisible: true });
  };

  React.useEffect(() => {
    return () => setCreateNoteTooltip({ time: -1, isVisible: false });
  }, []);

  return (
    <GuidePopup
      title={
        <div className="color-gray-dark">
          Introducing <span className={''}>Notes</span>
        </div>
      }
      description={'Annotate session replays and share your feedback with the rest of your team.'}
    >
      <Button icon="quotes" variant="text" disabled={tooltipActive} onClick={toggleNotePopup}>
        Add Note
      </Button>
    </GuidePopup>
  );
}

const NotePopupPl = observer(NotePopup);

const NotePopupComp = connect(
  (state: any) => ({ tooltipActive: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']) }),
  { setCreateNoteTooltip }
)(NotePopupPl);

export default React.memo(NotePopupComp);
