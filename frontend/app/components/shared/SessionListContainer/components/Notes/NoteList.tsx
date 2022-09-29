import React from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { sliceListPerPage } from 'App/utils';
import NoteItem from './NoteItem';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Note } from 'App/services/NotesService';

function NotesList({ members }: {members: Array<Record<string, any>>}) {
  const { notesStore } = useStore()
  const [list, setList] = React.useState<Note[]>([])

  React.useEffect(() => {
    if (!notesStore.notes.length) {
      notesStore.fetchNotes().then(notes => setList(notes))
    }
  }, [])

  React.useEffect(() => {
    if (notesStore.notes.length) {
      if (notesStore.activeTags.length) {
        const tagsLen = notesStore.activeTags.length
        const filteredList: Note[] = notesStore.notes.filter(note => {
          for (let i = 0; i < tagsLen; i++) {
            const tag = notesStore.activeTags[i]
            if (note.tags.includes(tag)) {
              return note
            }
          }
        })
        setList(filteredList)
      } else {
        setList(notesStore.notes)
      }
    }
  }, [notesStore.activeTags])

  return (
    <NoContent
      show={list.length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <Icon name="no-metrics" size={80} color="figmaColors-accent-secondary" />
          <div className="text-center text-gray-600 my-4">No notes yet</div>
        </div>
      }
    >
      <div className="mt-3 border-b rounded bg-white">
        {sliceListPerPage(list, notesStore.page - 1, notesStore.pageSize).map(note => (
          <React.Fragment key={note.noteId}>
            <NoteItem
              userId={note.userId}
              tags={note.tags}
              timestamp={note.timestamp}
              isPublic={note.isPublic}
              description={note.message}
              date={note.createdAt}
              noteId={note.noteId}
              sessionId={note.sessionId}
              userEmail={members.find(m => m.id === note.userId).email || note.userId}
            />
          </React.Fragment>
        ))}
      </div>

      <div className="w-full flex items-center justify-between py-4 px-6">
        <div className="text-disabled-text">
          Showing <span className="font-semibold">{Math.min(list.length, notesStore.pageSize)}</span> out
          of <span className="font-semibold">{list.length}</span> notes
        </div>
        <Pagination
          page={notesStore.page}
          totalPages={Math.ceil(list.length / notesStore.pageSize)}
          onPageChange={(page) => notesStore.changePage(page)}
          limit={notesStore.pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default observer(NotesList);
