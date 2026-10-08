import React from 'react';

import { CriticalFlag } from './CriticalFlag';

export type CritState = 'none' | 'team' | 'mine' | 'dismissed';

/* The critical flag in the issue-list row and the player; opens CriticalDialog. */
export default function CriticalToggle({
  state,
  matchedBy,
  onOpen,
  stopPropagation,
}: {
  state: CritState;
  matchedBy?: string;
  onOpen: () => void;
  stopPropagation?: boolean;
}) {
  return (
    <span
      className="inline-flex"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      <CriticalFlag state={state} matchedBy={matchedBy} onClick={onOpen} />
    </span>
  );
}
