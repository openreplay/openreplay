import React from 'react';
import { Controls as PlayerControls, connectPlayer } from 'Player';
import { Toggler } from 'UI';

interface Props {
  toggleAutoplay: () => void;
  autoplay: boolean;
}
function AutoplayToggle(props: Props) {
  const { autoplay } = props;
  return (
    <div
      onClick={props.toggleAutoplay}
      className="cursor-pointer flex items-center mr-2 hover:bg-gray-light-shade rounded-md p-2"
    >
      <Toggler name="sessionsLive" onChange={props.toggleAutoplay} checked={autoplay} />
      <span className="ml-2 whitespace-nowrap">Auto-Play</span>
    </div>
  );
}

export default connectPlayer(
  (state: any) => ({
    autoplay: state.autoplay,
  }),
  {
    toggleAutoplay: PlayerControls.toggleAutoplay,
  }
)(AutoplayToggle);
