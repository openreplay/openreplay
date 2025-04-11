import React from 'react';
import { observer } from 'mobx-react-lite';
import { PlayerContext } from 'Components/Session/playerContext';
import { Loader } from 'UI';
import PlayIconLayer from 'Components/Session_/Player/Overlay/PlayIconLayer';
import ClipFeedback from 'Components/Session/Player/ClipPlayer/ClipFeedback';
import AutoplayTimer from 'Components/Session/Player/ClipPlayer/AutoPlayTimer';

interface Props {
  autoplay: boolean;
}

function Overlay({ autoplay }: Props) {
  const { player, store } = React.useContext(PlayerContext);
  const togglePlay = () => player.togglePlay();

  const { messagesLoading, playing, completed } = store.get();

  return (
    <>
      {messagesLoading ? <Loader /> : null}
      {/* <div className="hidden group-hover:block"> */}
      {/*    <ClipFeedback/> */}
      {/* </div> */}
      <PlayIconLayer playing={playing} togglePlay={togglePlay} />
      {completed && autoplay && <AutoplayTimer />}
    </>
  );
}

export default observer(Overlay);
