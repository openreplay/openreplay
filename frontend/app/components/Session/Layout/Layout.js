import React from 'react';
import { observer } from 'mobx-react-lite';
import { EscapeButton } from 'UI';

import Header from './Header';
import ToolPanel from './ToolPanel';
import PlayOverlay from './PlayOverlay';
import Controls from './Player/Controls';

function Layout({ children, player, toolbar }) {
  return (
    <div className="flex flex-col h-screen">
      {!player.fullscreen.enabled && <Header player={player} />}
      <div className="flex-1 flex">
        <div
          className="flex flex-col"
        >
          <div className="flex-1 flex flex-col relative bg-white border-gray-light">
            {player.fullscreen.enabled && <EscapeButton onClose={player.toggleFullscreen} />}
            <div className="flex-1 relative overflow-hidden">
              {children}
              <PlayOverlay player={player} />
            </div>
            <Controls player={player} toolbar={toolbar} />
          </div>
          {!player.fullscreen.enabled && <ToolPanel player={player} toolbar={toolbar} />}
        </div>
      </div>
    </div>
  );
}

export default observer(Layout);
