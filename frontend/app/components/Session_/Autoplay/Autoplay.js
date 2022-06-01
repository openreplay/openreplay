import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { setAutoplayValues } from 'Duck/sessions'
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, Slider, Toggler } from 'UI';
import { connectPlayer } from 'Player/store';
import { Controls as PlayerControls } from 'Player';
import { Tooltip } from 'react-tippy';
import cn from 'classnames';
import { disabled } from '../Player/Controls/controlButton.css';

function Autoplay(props) {
  const { previousId, nextId, autoplay } = props

  useEffect(() => {
    props.setAutoplayValues()
  }, [])

  return (
    <div className="flex items-center">
      <div onClick={props.toggleAutoplay} className="cursor-pointer flex items-center mr-2 hover:bg-gray-light-shade rounded-md p-1">
        <Toggler
          name="sessionsLive"
          onChange={ props.toggleAutoplay }
          checked={ autoplay }
        />
        <span className="ml-2">Auto-Play</span>
      </div>

      <Tooltip
        delay={0}
        arrow
        animation="fade"
        position="bottom center"
        title="Play Previous Session"
        disabled={!previousId}
        className={cn(
          "p-1 bg-gray-bg group rounded-full color-gray-darkest font-medium", 
          previousId && 'cursor-pointer',
          !disabled && 'hover:bg-bg-blue'
        )}
      >
        <Link to={ sessionRoute(previousId) } disabled={!previousId}> 
          <Icon name="prev1" className="group-hover:fill-main" color="inherit" size="16" />
        </Link>
      </Tooltip>

      <Tooltip
        delay={0}
        arrow
        animation="fade"
        position="bottom center"
        title="Play Next Session"
        disabled={!nextId}
        className={cn(
          "p-1 bg-gray-bg group ml-1 rounded-full color-gray-darkest font-medium", 
          nextId && 'cursor-pointer',
          !disabled && 'hover:bg-bg-blue'
        )}
      >
        <Link to={ sessionRoute(nextId) } disabled={!nextId} >
          <Icon name="next1" className="group-hover:fill-main" color="inherit" size="16" />
        </Link>
      </Tooltip>
    </div>
  )
}

const connectAutoplay = connect(state => ({
  previousId: state.getIn([ 'sessions', 'previousId' ]),
  nextId: state.getIn([ 'sessions', 'nextId' ]),
}), { setAutoplayValues })

export default connectAutoplay(connectPlayer(state => ({
  autoplay: state.autoplay,
}), {
  toggleAutoplay: PlayerControls.toggleAutoplay
})(Autoplay))
