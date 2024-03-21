import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';
import { toggleZoom } from 'Duck/components/player';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface Props {
  enabled: boolean;
  startTs: number;
  endTs: number;
  toggleZoom: typeof toggleZoom;
}

function TimelineZoomButton({ enabled, startTs, endTs, toggleZoom }: Props) {
  const { store } = React.useContext(PlayerContext);

  const onClickHandler = () => {
    console.log(store.get().time)
    toggleZoom({ enabled: !enabled, range: [Math.max(store.get().time - 500, 0), Math.min(store.get().time + 500, store.get().endTime)] });
  }
  return (
    <Button
      onClick={onClickHandler}
      size={'small'}
      className={'flex items-center font-semibold'}
    >
      Timeline Zoom {enabled ? 'On' : 'Off'}
    </Button>
  );
}

export default connect(
  (state: Record<string, any>) => ({
    enabled: state.getIn(['components', 'player']).timelineZoom.enabled,
    startTs: state.getIn(['components', 'player']).timelineZoom.startTs,
    endTs: state.getIn(['components', 'player']).timelineZoom.endTs,
  }),
  { toggleZoom }
)(observer(TimelineZoomButton));
