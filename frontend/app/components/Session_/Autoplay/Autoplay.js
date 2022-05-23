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
  console.log(previousId, nextId)
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

      <Link to={ sessionRoute(previousId) } disabled={!previousId}>
		  	<Icon name="prev1" size="16" color="teal" />
		  </Link>
      <Link to={ sessionRoute(nextId) } disabled={!nextId}>
		  	<Icon name="next1" size="16" color="teal" />
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
