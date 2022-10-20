import React from 'react'
import SectionTitle from './SectionTitle';
import { session as sessionRoute } from 'App/routes';
import PlayLink from 'Shared/SessionItem/PlayLink';

export default function Session({ user, sessionId, sessionUrl }: { user: string, sessionId: string, sessionUrl: string }) {
  return (
    <div>
      <SectionTitle>Session recording</SectionTitle>
      <div className="border hover:border-gray-light rounded flex items-center justify-between p-2">
        <div className="flex flex-col">
          <div className="text-lg">{user}</div>
          <div className="text-disabled-text">
            {sessionUrl}
          </div>
        </div>
        <PlayLink isAssist={false} viewed={false} sessionId={sessionId} />
      </div>
    </div>
  );
}
