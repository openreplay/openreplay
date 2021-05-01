import { observer } from 'mobx-react-lite';
import cn from 'classnames';

import { Loader, CircularLoader } from 'UI';


function ScreenWithLoaders({ player, screenId, className }) {
	return (
		<div className={ className } id={screenId}>
      <div className={ 
        cn("absolute inset-0", { 
          "opacity-75 bg-gray-light": player.loading || player.buffering, 
          "bg-transparent": !(player.loading || player.buffering),
        })}
      >
        <Loader loading={ player.loading }>
          <CircularLoader loading={ player.buffering } inline={false} size="large"/>
        </Loader>
      </div>
    </div>
	);
}


export default observer(ScreenWithLoaders);
