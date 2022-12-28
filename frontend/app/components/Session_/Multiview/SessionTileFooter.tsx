import React from 'react'
import { Icon } from 'UI'

function SessionTileFooter({
  userDisplayName,
  sessionId,
  replaceSession,
  deleteSession,
}: {
  userDisplayName: string;
  sessionId: string;
  replaceSession: (e: any, id: string) => void;
  deleteSession: (e: any, id: string) => void;
}) {
  return (
    <div className="absolute z-10 cursor-default bottom-0 w-full h-8 left-0 px-4 opacity-70 bg-gray-darkest text-white flex items-center justify-between">
      <div>{userDisplayName}</div>
      <div className="hidden group-hover:flex h-full items-center gap-4">
        <div
          className="cursor-pointer hover:font-semibold border-l flex items-center justify-center h-full border-r border-white px-2"
          onClick={(e) => replaceSession(e, sessionId)}
        >
          Replace Session
        </div>
        <div
          className="cursor-pointer hover:font-semibold"
          onClick={(e) => deleteSession(e, sessionId)}
        >
          <Icon name="trash" size={18} color="white" />
        </div>
      </div>
    </div>
  );
}

export default SessionTileFooter;
