import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';

import { RequestDetails } from './RequestDetails';

/** Mounted inside `.m-player`: requests open here, over the player's right edge. */
function RequestSheetHost() {
  const { t } = useTranslation();
  const { uiPlayerStore } = useStore();
  const { player } = React.useContext(PlayerContext);
  const sheet = uiPlayerStore.requestSheet;

  React.useEffect(() => {
    uiPlayerStore.setRequestSheetHost(true);
    return () => {
      uiPlayerStore.setRequestSheetHost(false);
      uiPlayerStore.closeRequestSheet();
    };
  }, []);

  const resource = sheet?.rows[sheet.index];
  if (!sheet || !resource) return null;
  return (
    <aside
      className="m-dt__sheet m-rq"
      role="dialog"
      aria-label={t('Request {{url}}', { url: resource.url })}
    >
      <RequestDetails
        resource={resource}
        index={sheet.index}
        total={sheet.rows.length}
        onPrev={() => uiPlayerStore.setRequestSheetIndex(sheet.index - 1)}
        onNext={() => uiPlayerStore.setRequestSheetIndex(sheet.index + 1)}
        onJump={(time) => player?.jump(time)}
        onClose={uiPlayerStore.closeRequestSheet}
      />
    </aside>
  );
}

export default observer(RequestSheetHost);
