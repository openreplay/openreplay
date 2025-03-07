import React from 'react';
import Timeline from 'Components/Session/Player/ClipPlayer/Timeline';
import { PlayButton, PlayingState } from '@/player-ui';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Button } from 'antd';
import { useNavigate } from 'react-router';
import { CirclePlay } from 'lucide-react';
import { withSiteId } from '@/routes';
import * as routes from '@/routes';
import { useStore } from '@/mstore';
import Session from 'Types/session';

function ClipPlayerControls({
  session,
  range,
}: {
  session: Session;
  range: [number, number];
}) {
  const { projectsStore } = useStore();
  const { player, store } = React.useContext(PlayerContext);
  const navigate = useNavigate();
  const siteId = projectsStore.siteId;

  const { playing, completed } = store.get();

  const state = completed
    ? PlayingState.Completed
    : playing
    ? PlayingState.Playing
    : PlayingState.Paused;

  const togglePlay = () => {
    player.togglePlay();
  };

  const showFullSession = () => {
    const path = withSiteId(routes.session(session.sessionId), siteId);
    navigate(path + '?jumpto=' + Math.round(range[0]));
  };

  return (
    <div className="relative flex items-center gap-4 p-3 border-t">
      <PlayButton state={state} togglePlay={togglePlay} iconSize={30} />
      <Timeline range={range} />
      <Button size="small" type='primary' onClick={showFullSession}>
        Play Full Session
        <CirclePlay size={16}/>
      </Button>
    </div>
  );
}

export default observer(ClipPlayerControls);
