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


const ScreenWrapper = withOverlay()(React.memo(() => <div className={ stl.screenWrapper } />));

@connectPlayer(state => ({
  playing: state.playing,
  loading: state.messagesLoading,
  disconnected: state.disconnected,
}))
@connect(state => ({
  //session: state.getIn([ 'sessions', 'current' ]),
  targetSelector: state.getIn([ 'components', 'targetDefiner', 'target', 'path' ]),
  targetDefinerDisplayed: state.getIn([ 'components', 'targetDefiner', 'isDisplayed' ]),
  inspectorMode: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]),
  fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
}), {
  hideTargetDefiner,
  toggleInspectorMode: () => toggleInspectorMode(false),
  fullscreenOff,
})
@withOverlay('targetDefinerDisplayed', 'hideTargetDefiner')
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
      inspectorMode,
      targetDefinerDisplayed,
      bottomBlockIsActive,
      loading,
      disconnected,
      fullscreen,
      fullscreenOff,
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
        <div className={ cn(stl.playerView, targetDefinerDisplayed ? stl.inspectorMode : '') }>
          { !inspectorMode && // TODO: beauty
            <React.Fragment>
              <div className={ stl.overlay }>
                <Loader loading={ loading } />
                { disconnected && <div className={ stl.disconnected }>{ "Disconnected" }</div> }
              </div>
              <div 
                className={ stl.overlay }
                onClick={ this.togglePlay }
              >
                <div 
                  className={ cn(stl.iconWrapper, { 
                    [ stl.zoomIcon ]: showPlayOverlayIcon 
                  }) } 
                >
                  <div className={ playing ? stl.playIcon : stl.pauseIcon } />
                </div>
              </div>
            </React.Fragment>
          }
          <ScreenWrapper 
            ref={ this.screenWrapper } 
            overlayed={ targetDefinerDisplayed }
          />
        </div>
        <Controls
          { ...PlayerControls }
        />
      </div>
    );
  }
}
