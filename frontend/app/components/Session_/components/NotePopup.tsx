import React from 'react';
import { connect } from 'react-redux';
import { setCreateNoteTooltip } from 'Duck/sessions';
import { PlayerContext } from 'App/components/Session/playerContext';
import { Button, Popover } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

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
    <Popover content={'Add Note'}>
      <Button
        size={'small'}
        className={'flex items-center justify-center'}
        onClick={toggleNotePopup}
        disabled={tooltipActive}
      >
        <MessageOutlined />
      </Button>
    </Popover>
  );
}

const NotePopupComp = connect(
  (state: any) => ({ tooltipActive: state.getIn(['sessions', 'createNoteTooltip', 'isVisible']) }),
  { setCreateNoteTooltip }
)(NotePopup);

export default React.memo(NotePopupComp);
