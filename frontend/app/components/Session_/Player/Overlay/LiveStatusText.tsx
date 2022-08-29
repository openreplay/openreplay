import React from 'react';
import ovStl from './overlay.module.css';
import { ConnectionStatus } from 'Player/MessageDistributor/managers/AssistManager';
import { Loader } from 'UI';

interface Props {
  text: string;
  concetionStatus: ConnectionStatus;
}

export default function LiveStatusText({ text, concetionStatus }: Props) {
  const renderView = () => {
    switch (concetionStatus) {
      case ConnectionStatus.Closed:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="text-lg -mt-8">Session not found</div>
            <div className="text-sm">The remote session doesn’t exist anymore. <br/> The user may have closed the tab/browser while you were trying to establish a connection.</div>
          </div>
        )

      case ConnectionStatus.Connecting:
        return (
          <div className="flex flex-col items-center">
            <Loader loading={true} size="small" />
            <div className="text-lg -mt-8">Connecting...</div>
            <div className="text-sm">Establishing a connection with the remote session.</div>
          </div>
        )
      case ConnectionStatus.WaitingMessages:
        return (
          <div className="flex flex-col items-center">
            <Loader loading={true} size="small" />
            <div className="text-lg -mt-8">Waiting for the session to become active...</div>
            <div className="text-sm">If it's taking too much time, it could mean the user is simply inactive.</div>
          </div>
        )
      case ConnectionStatus.Connected:
        return (
          <div className="flex flex-col items-center">
            <div className="text-lg -mt-8">Connected</div>
          </div>
        )
      case ConnectionStatus.Inactive:
        return (
          <div className="flex flex-col items-center">
            <Loader loading={true} size="small" />
            <div className="text-lg -mt-8">Waiting for the session to become active...</div>
            <div className="text-sm">If it's taking too much time, it could mean the user is simply inactive.</div>
          </div>
        )
      case ConnectionStatus.Disconnected:
        return (
          <div className="flex flex-col items-center">
            <div className="text-lg -mt-8">Disconnected</div>
            <div className="text-sm">The connection was lost with the remote session. The user may have simply closed the tab/browser.</div>
          </div>
        )
      case ConnectionStatus.Error:
        return (
          <div className="flex flex-col items-center">
            <div className="text-lg -mt-8">Error</div>
            <div className="text-sm">Something wrong just happened. Try refreshing the page.</div>
          </div>
        )
    }
  }
  return <div className={ovStl.overlay}>
    { renderView()}
  </div>
}
