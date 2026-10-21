import { Button } from '@/ui/actions/button';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Crosshair } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { PlayerContext } from 'Components/Session/playerContext';

function TimelineZoomButton() {
  const { t } = useTranslation();
  const { uiPlayerStore } = useStore();
  const { toggleZoom } = uiPlayerStore;
  const { enabled } = uiPlayerStore.timelineZoom;
  const { store } = React.useContext(PlayerContext);

  const onClickHandler = () => {
    // 2% of the timeline * 2 as initial zoom range
    const distance = store.get().endTime / 50;
    toggleZoom({
      enabled: !enabled,
      range: [
        Math.max(store.get().time - distance, 0),
        Math.min(store.get().time + distance, store.get().endTime),
      ],
    });
  };

  React.useEffect(
    () => () => {
      toggleZoom({ enabled: false, range: [0, 0] });
    },
    [],
  );
  return (
    <Tooltip
      title={t(
        'Select a portion of the timeline to view the x-ray and activity for that specific selection.',
      )}
    >
      <Button
        variant={enabled ? 'secondary' : 'subtle'}
        aria-pressed={enabled}
        onClick={onClickHandler}
      >
        <Crosshair size={13} aria-hidden="true" />
        {enabled ? t('Focus mode on') : t('Focus mode')}
      </Button>
    </Tooltip>
  );
}

export default observer(TimelineZoomButton);
