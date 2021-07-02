import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import cn from 'classnames';
import { Loader, IconButton, EscapeButton } from 'UI';
import { hide as hideTargetDefiner, toggleInspectorMode } from 'Duck/components/targetDefiner';
import { fullscreenOff } from 'Duck/components/player';
import withOverlay from 'Components/hocs/withOverlay';
import { attach as attachPlayer, Controls as PlayerControls, connectPlayer } from 'Player';
import Controls from './Controls';
import stl from './player.css';
import AutoplayTimer from '../AutoplayTimer';


const ScreenWrapper = withOverlay()(React.memo(() => <div className={ stl.screenWrapper } />));

@connectPlayer(state => ({
  playing: state.playing,
  loading: state.messagesLoading,
  disconnected: state.disconnected,
  disabled: state.cssLoading || state.messagesLoading || state.inspectorMode,
  removeOverlay: !state.messagesLoading && state.inspectorMode || state.live,
  completed: state.completed,
  autoplay: state.autoplay
}))
@connect(state => ({
  //session: state.getIn([ 'sessions', 'current' ]),
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
  nextId: state.getIn([ 'sessions', 'nextId' ]),
}), {
  hideTargetDefiner,
  toggleInspectorMode: () => toggleInspectorMode(false),
  fullscreenOff,
})
export default class Player extends React.PureComponent {
  state = {
    showPlayOverlayIcon: false,

    startedToPlayAt: Date.now(),
  };
  screenWrapper = React.createRef();

  componentDidMount() {
    const parentElement = findDOMNode(this.screenWrapper.current);  //TODO: good architecture
    attachPlayer(parentElement);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.targetSelector !== this.props.targetSelector) {
      PlayerControls.mark(this.props.targetSelector);
    }
    if (prevProps.playing !== this.props.playing) {
      if (this.props.playing) {
        this.setState({ startedToPlayAt: Date.now() });
      } else {
        this.updateWatchingTime();
      }
    }
  }

  componentWillUnmount() {
    if (this.props.playing) {
      this.updateWatchingTime();
    }
  }

  updateWatchingTime() {
    const diff = Date.now() - this.state.startedToPlayAt;
  }


  // onTargetClick = (targetPath) => {
  //   const { targetCustomList, location } = this.props;
  //   const targetCustomFromList = targetCustomList !== this.props.targetSelector
  //      .find(({ path }) => path === targetPath);
  //   const target = targetCustomFromList
  //     ? targetCustomFromList.set('location', location)
  //     : { path: targetPath, isCustom: true, location };
  //   this.props.showTargetDefiner(target);
  // }

  togglePlay = () => {
    this.setState({ showPlayOverlayIcon: true });
    PlayerControls.togglePlay();

    setTimeout(
      () => this.setState({ showPlayOverlayIcon: false }),
      800,
    );
  }

  render() {
    const {
      showPlayOverlayIcon,
    } = this.state;
    const {
      className,
      playing,
      disabled,
      removeOverlay,
      bottomBlockIsActive,
      loading,
      disconnected,
      fullscreen,
      fullscreenOff,
      completed,
      autoplay,
      nextId,
    } = this.props;

    return (
      <div
        className={ cn(className, stl.playerBody, "flex flex-col relative") }
        data-bottom-block={ bottomBlockIsActive }
      >
        { fullscreen && 
          <EscapeButton onClose={ fullscreenOff } />
          // <IconButton 
          //   size="18"
          //   className="ml-auto mb-5"
          //   style={{ marginTop: '-5px' }}
          //   onClick={ fullscreenOff }
          //   size="small"
          //   icon="close"
          //   label="Esc"
          // />
        }
        <div className="relative flex-1">
          { !removeOverlay && 
            <div 
              className={ stl.overlay }
              onClick={ disabled ? null : this.togglePlay }
            >
              <Loader loading={ loading } />
              <div 
                className={ cn(stl.iconWrapper, { 
                  [ stl.zoomIcon ]: showPlayOverlayIcon 
                }) } 
              >
                <div className={ playing ? stl.playIcon : stl.pauseIcon } />
              </div>
            </div>
          }
          { completed && autoplay && nextId && <AutoplayTimer /> }
          <ScreenWrapper 
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
