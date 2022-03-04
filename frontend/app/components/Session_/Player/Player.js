import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import { EscapeButton } from 'UI';
import { hide as hideTargetDefiner } from 'Duck/components/targetDefiner';
import { fullscreenOff } from 'Duck/components/player';
import { attach as attachPlayer, Controls as PlayerControls, connectPlayer } from 'Player';
import Controls from './Controls';
import Overlay from './Overlay';
import stl from './player.css';
import EventsToggleButton from '../../Session/EventsToggleButton';

@connectPlayer(state => ({
  live: state.live,
}))
@connect(state => {
  const isAssist = window.location.pathname.includes('/assist/');
  return {
    fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
    nextId: state.getIn([ 'sessions', 'nextId' ]),
    closedLive: !!state.getIn([ 'sessions', 'errors' ]) || (isAssist && !state.getIn([ 'sessions', 'current', 'live' ])),
  }
}, {
  hideTargetDefiner,
  fullscreenOff,
})
export default class Player extends React.PureComponent {
  screenWrapper = React.createRef();

  componentDidMount() {
    if (this.props.closedLive) return;

    const parentElement = findDOMNode(this.screenWrapper.current);  //TODO: good architecture
    attachPlayer(parentElement);
  }

  render() {
    const {
      className,
      bottomBlockIsActive,
      fullscreen,
      fullscreenOff,
      nextId,
      live,
      closedLive,
    } = this.props;

    return (
      <div
        className={ cn(className, stl.playerBody, "flex flex-col relative") }
        data-bottom-block={ bottomBlockIsActive }
      >
        {fullscreen && <EscapeButton onClose={ fullscreenOff } />}
        {!live && !fullscreen && <EventsToggleButton /> }
        <div className="relative flex-1 overflow-hidden">
          <Overlay nextId={nextId} togglePlay={PlayerControls.togglePlay} closedLive={closedLive} />
          <div 
            className={ stl.screenWrapper }
            ref={ this.screenWrapper } 
          />
        </div>
        <Controls
          { ...PlayerControls }
        />
      </div>
    );
  }
}
