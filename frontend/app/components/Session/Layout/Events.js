import React from 'react';
import { observer } from 'mobx-react-lite';
import { EVENTS }  from 'Player/ios/state';
import EventsBlock from 'Components/Session_/EventsBlock';

function Events({ style, player }) {
	return (
		<EventsBlock 
			style={style}
			playing={ player.playing } 
			player={ player }
			currentTimeEventIndex={ player.lists[EVENTS].countNow - 1 }
		/>
	);
}


export default  observer(Events);