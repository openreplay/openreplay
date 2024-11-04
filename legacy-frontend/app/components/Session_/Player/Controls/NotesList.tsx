import React from 'react';
import { Icon } from 'UI';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite'
import { getTimelinePosition } from './getTimelinePosition'

function NotesList({ scale }: { scale: number }) {
  const { notesStore } = useStore();
  const notes = notesStore.sessionNotes;

  const visibleNotes = React.useMemo(() => {
    return notes.filter(note => note.timestamp > 0)
  }, [notes.length])

  return (
    <>
      {visibleNotes.map((note) => (
        <div
          key={note.noteId}
          style={{
            position: 'absolute',
            background: 'white',
            zIndex: 3,
            pointerEvents: 'none',
            height: 10,
            width: 16,
            left: `${getTimelinePosition(note.timestamp, scale)}%`,
          }}
        >
          <Icon name="quotes" style={{ width: 16, height: 10 }} color="main" />
        </div>
      ))}
    </>
  );
}

export default observer(NotesList)