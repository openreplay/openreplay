import React from 'react'
import SectionTitle from './SectionTitle';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { Tooltip } from 'react-tippy'

export default function Session({ user, sessionId, sessionUrl }: { user: string, sessionId: string, sessionUrl: string }) {

  const onSessionClick = () => {
    window.open(sessionUrl, '_blank').focus();
  }

  return (
    <div>
      <SectionTitle>Session recording</SectionTitle>
      {/* @ts-ignore */}
      <Tooltip title="Play session in new tab">
        <div className="border hover:border-main cursor-pointer rounded flex items-center justify-between p-2" onClick={onSessionClick}>
          <div className="flex flex-col">
            <div className="text-lg">{user}</div>
            <div className="text-disabled-text">
              {sessionUrl}
            </div>
          </div>
          <PlayLink newTab isAssist={false} viewed={false} sessionId={sessionId} />
        </div>
      </Tooltip>
    </div>
  );
}
