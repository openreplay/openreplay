import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { setAutoplayValues } from 'Duck/sessions'
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, Slider, Toggler } from 'UI';
import { connectPlayer } from 'Player/store';
import { Controls as PlayerControls } from 'Player';

function Autoplay(props) {
  const { previousId, nextId, autoplay } = props

  useEffect(() => {
    props.setAutoplayValues()
  }, [])

  return (
    <div className="flex items-center">
      <div onClick={props.toggleAutoplay} className="cursor-pointer flex items-center mr-2">
        <Toggler
          name="sessionsLive"
          onChange={ props.toggleAutoplay }
          checked={ autoplay }
          plain
        />
        <span className="ml-2">Auto-Play</span>
      </div>

      <Link className="mr-1 cursor-pointer p-2 bg-tealx-light rounded-full color-tealx font-medium" to={ sessionRoute(previousId) } disabled={!previousId}>
		  	<Icon name="prev1" className="hover:fill-teal" color="inherit" size="16" />
		  </Link>

      <Link className="cursor-pointer p-2 bg-tealx-light rounded-full color-tealx font-medium" to={ sessionRoute(nextId) } disabled={!nextId}>
		  	<Icon name="next1" className="hover:fill-teal" color="inherit" size="16" />
		  </Link>
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
