import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';

interface Props {
  children: React.ReactNode;
  endTime: number;
}

const OverviewPanelContainer = React.memo((props: Props) => {
  const { player } = React.useContext(PlayerContext);
  const { endTime } = props;

  const onClickTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    // portalled popovers bubble through the React tree
    if (!e.currentTarget.contains(e.target as Node)) return;
    const track = e.currentTarget.querySelector('.m-dt__lane-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (e.clientX < rect.left) return;
    const p = (e.clientX - rect.left) / rect.width;
    const time = Math.max(Math.round(p * endTime), 0);
    if (time) {
      player.jump(time);
    }
  };

  return (
    <div className="m-dt__xray" onClick={onClickTrack}>
      {props.children}
    </div>
  );
});

export default OverviewPanelContainer;
