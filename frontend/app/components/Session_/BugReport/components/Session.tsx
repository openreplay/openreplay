import React from 'react'
import SectionTitle from './SectionTitle';
import { session as sessionRoute } from 'App/routes';
import PlayLink from 'Shared/SessionItem/PlayLink';

export default function Session({ user, sessionId }: { user: string, sessionId: string }) {
  return (
    <div>
      <SectionTitle>Session recording</SectionTitle>
      <div className="border rounded flex items-center justify-between p-2">
        <div className="flex flex-col">
          <div className="text-lg">{user}</div>
          <div className="text-disabled-text">
            {`${window.location.origin}/${window.location.pathname.split('/')[1]}${sessionRoute(sessionId)}`}
          </div>
        </div>
        <PlayLink isAssist={false} viewed={false} sessionId={sessionId} />
      </div>
    </div>
  );
}
