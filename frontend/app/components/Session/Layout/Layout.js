import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { EscapeButton, Loader } from 'UI';

import Header from './Header';
import ToolPanel from'./ToolPanel';
import Events from './Events';
import PlayOverlay from './PlayOverlay';
import Controls from './Player/Controls';


function Layout({ children, player, toolbar }) {
	return (
		<div className="flex flex-col h-screen">
			{ !player.fullscreen.enabled && <Header player={player} /> }
			<div className="flex-1 flex">
				<div className="flex flex-col" style={{ width: player.fullscreen.enabled ? "100vw" : "calc(100vw - 270px)" }}>
					<div
			      className="flex-1 flex flex-col relative bg-white border-gray-light"
			    >
			      { player.fullscreen.enabled && 
			        <EscapeButton onClose={ player.toggleFullscreen } />
			      }
			      <div className="flex-1 relative overflow-hidden" >
			        {/* <Loader loading={ player.loading }> */}
			        	{ children }
			        {/* </Loader>  */}
			        <PlayOverlay player={player} />
			      </div>
			      <Controls player={ player } toolbar={ toolbar } />
			    </div>
					{ !player.fullscreen.enabled && <ToolPanel player={ player } toolbar={ toolbar }/> }
				</div>
				{ !player.fullscreen.enabled &&  
					<Events 
						style={{ width: "270px" }}
						player={ player }
					/>
				}
			</div>
		</div>
	);
}

export default observer(Layout);