import React from 'react'
import SectionTitle from './SectionTitle';
import { Icon, Tooltip } from 'UI'

export default function Session({ user, sessionUrl }: { user: string, sessionUrl: string }) {

  const onSessionClick = () => {
    window.open(sessionUrl, '_blank').focus();
  }

  return (
    <div>
      <SectionTitle>Session recording</SectionTitle>
      {/* @ts-ignore */}
      <Tooltip title="Play session in new tab">
        <div className="border hover:border-main hover:bg-active-blue cursor-pointer rounded flex items-center justify-between p-2" onClick={onSessionClick}>
          <div className="flex flex-col">
            <div className="text-lg">{user}</div>
            <div className="text-disabled-text">
              {sessionUrl}
            </div>
          </div>
          <Icon name="play-fill" size={38} color="teal" />
        </div>
      </Tooltip>
    </div>
  );
}
