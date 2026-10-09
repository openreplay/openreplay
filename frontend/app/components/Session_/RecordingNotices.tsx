import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import WarnBadge from 'Components/Session_/WarnBadge';

/** The replay screen's notices: facts about this recording that change how to read it. */
function RecordingNotices() {
  const { sessionStore, projectsStore, settingsStore } = useStore();
  const { player, store } = React.useContext(PlayerContext);
  if (!player) return null;
  const { location: currentLocation = '', vModeBadge } = store.get();

  const onVMode = () => {
    settingsStore.sessionSettings.updateKey('virtualMode', true);
    player.enableVMode?.();
    location.reload();
  };

  return (
    <WarnBadge
      siteId={projectsStore.siteId!}
      currentLocation={currentLocation}
      version={sessionStore.current?.trackerVersion ?? ''}
      virtualElsFailed={vModeBadge}
      onVMode={onVMode}
    />
  );
}

export default observer(RecordingNotices);
