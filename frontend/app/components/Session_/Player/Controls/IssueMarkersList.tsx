import { Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import { PlayerContext } from 'Components/Session/playerContext';
import { useStore } from 'App/mstore';

import { getTimelinePosition } from './getTimelinePosition';

/* AI-detected issue markers on the player timeline: a soft red glow centered on
   the moment (the location is fuzzy), a bold tick with a white halo, and a dot.
   Driven by sessionStore.timelineIssues, so it's empty for a regular session
   and populated by the issue player. Clicking a marker seeks to the moment. */
function IssueMarkersList({ scale }: { scale: number }) {
  const { sessionStore } = useStore();
  const { player } = useContext(PlayerContext);
  const issues = sessionStore.timelineIssues;

  if (!issues.length) return null;

  return (
    <>
      {issues.map((issue, i) => {
        const pos = getTimelinePosition(issue.time, scale);
        return (
          <React.Fragment key={`${issue.time}-${i}`}>
            <div
              style={{
                position: 'absolute',
                left: `${pos}%`,
                width: 24,
                height: '10px',
                transform: 'translateX(-50%)',
                background:
                  'linear-gradient(to right, transparent, rgba(204,0,0,0.28) 50%, transparent)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
            <Tooltip title={issue.label || 'Issue detected here'}>
              <div
                role="button"
                aria-label="Jump to issue"
                onClick={(e) => {
                  e.stopPropagation();
                  player?.jump(issue.time);
                }}
                style={{
                  position: 'absolute',
                  left: `${pos}%`,
                  transform: 'translateX(-50%)',
                  zIndex: 6,
                  height: '10px',
                  width: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: '10px',
                    borderRadius: 1,
                    background: 'var(--color-red)',
                    boxShadow: '0 0 0 1.5px rgba(255,255,255,0.85)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 9,
                    height: 9,
                    borderRadius: 9999,
                    background: 'var(--color-red)',
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  }}
                />
              </div>
            </Tooltip>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default observer(IssueMarkersList);
