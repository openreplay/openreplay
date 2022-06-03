import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';


function Resolution ({ player }) {
	return (
	  <div className="flex items-center">
	    { player.state.width || 'x' } <Icon name="close" size="12" className="mx-1" /> { player.state.height || 'x' }
	  </div>
  );
}


export default observer(Resolution);