import React from 'react';
import { Icon } from 'UI';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite'
import { getTimelinePosition } from './getTimelinePosition'
import {Tooltip} from 'antd';

function NotesList({ scale }: { scale: number }) {
  const { notesStore } = useStore();
  const notes = notesStore.sessionNotes;

  const visibleNotes = React.useMemo(() => {
    return notes.filter(note => note.startAt >= 0 && note.endAt > note.startAt); // Ensure valid highlights
  }, [notes.length]);

  

  return (
    <>
      {visibleNotes.map((note) => {
        const startPos = getTimelinePosition(note.startAt, scale);
        const endPos = getTimelinePosition(note.endAt, scale);
        const highlightWidth = endPos - startPos;
        const iconPos = startPos + highlightWidth / 2;

        return (
          <React.Fragment key={note.noteId}>
            <div
              className="saved-highlight" 
              style={{
                position: 'absolute',
                left: `${startPos}%`,
                width: `${highlightWidth}%`,
                height: '10px',
                background: 'rgba(252, 193, 0, 0.4)', 
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            
            <div
              style={{
                position: 'absolute',
                zIndex: 3,
                pointerEvents: 'none',
                height: 10,
                width: 16,
                left: `${iconPos}%`, 
                transform: 'translateX(-50%)',
              }}
            >
              <Icon name="quotes" style={{ width: 16, height: 10 }} color="main" />
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default observer(NotesList);