import CreateNote from 'Components/Session_/Player/Controls/components/CreateNote';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { PlayerContext } from 'App/components/Session/playerContext';
import { Button, Tooltip } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';

function NotePopup() {
  const { sessionStore } = useStore();
  const tooltipActive = sessionStore.createNoteTooltip.isVisible;
  const { player, store } = React.useContext(PlayerContext);
  const { showModal, hideModal } = useModal();
  const toggleNotePopup = () => {
    if (tooltipActive) return;
    player.pause();
    showModal(
      <CreateNote hideModal={hideModal} isEdit={false} time={Math.round(store.get().time)} />,
      {
        right: true,
        width: 380,
      }
    );
  };

  return (
    <Tooltip title={'Add Note'} placement='bottom'>
      <Button
        size={'small'}
        className={'flex items-center justify-center'}
        onClick={toggleNotePopup}
        disabled={tooltipActive}
      >
        <MessageOutlined />
      </Button>
    </Tooltip>
  );
}

export default observer(NotePopup)
