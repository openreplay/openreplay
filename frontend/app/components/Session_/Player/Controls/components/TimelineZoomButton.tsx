import React from 'react';
import { Button, Tooltip } from 'antd';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

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
      placement="top"
    >
      <Button
        onClick={onClickHandler}
        size="small"
        className="flex items-center font-medium"
      >
        {t('Focus Mode:')}&nbsp;{enabled ? 'On' : 'Off'}
      </Button>
    </Tooltip>
  );
}

export default observer(TimelineZoomButton);
