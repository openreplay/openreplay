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
    <div className="absolute z-10 bottom-0 w-full left-0 p-2 opacity-70 bg-gray-darkest text-white flex justify-between">
      <div>{userDisplayName}</div>
      <div className="hidden group-hover:flex items-center gap-2">
        <div
          className="cursor-pointer hover:font-semibold"
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
