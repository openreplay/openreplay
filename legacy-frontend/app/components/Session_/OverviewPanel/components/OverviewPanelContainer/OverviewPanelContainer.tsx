import React from 'react';
import VerticalLine from '../VerticalLine';
import { PlayerContext } from 'App/components/Session/playerContext';


interface Props {
  children: React.ReactNode;
  endTime: number;
}

const OverviewPanelContainer = React.memo((props: Props) => {
  const { player } = React.useContext(PlayerContext)

  const { endTime } = props;
  const [mouseX, setMouseX] = React.useState(0);
  const [mouseIn, setMouseIn] = React.useState(false);
  const onClickTrack = (e: any) => {
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    if (time) {
      player.jump(time);
    }
  };

  return (
    <div className="overflow-x-auto overflow-y-hidden bg-gray-lightest" onClick={onClickTrack}>
      {mouseIn && <VerticalLine left={mouseX} className="border-gray-medium" />}
      <div className="">{props.children}</div>
    </div>
  );
});

export default OverviewPanelContainer;
