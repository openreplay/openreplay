import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { setAutoplayValues } from 'Duck/sessions'
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, Toggler, Popup } from 'UI';
import { connectPlayer } from 'Player/store';
import { Controls as PlayerControls } from 'Player';

function Autoplay(props) {
  const { previousId, nextId, autoplay } = props

  useEffect(() => {
    props.setAutoplayValues()
  }, [])

  return (
    <div className="flex items-center">
      <Link to={ sessionRoute(previousId) } disabled={!previousId}>
		  	<Icon name="prev1" size="20" color="teal" />
		  </Link>
      <Popup content={'Autoplay'} distance={22} >
        <Toggler
            name="sessionsLive"
            onChange={ props.toggleAutoplay }
            checked={ autoplay }
            style={{ margin: '0px 10px 0px 12px'}}
        />
      </Popup>
      
      <Link to={ sessionRoute(nextId) } disabled={!nextId}>
		  	<Icon name="next1" size="20" color="teal" />
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
