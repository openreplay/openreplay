import React from 'react';
import { NoContent, Pagination, Loader } from 'UI';
import { sliceListPerPage } from 'App/utils';
import NoteItem from './NoteItem';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function NotesList({ members }: { members: Array<Record<string, any>> }) {
  const { notesStore } = useStore();

  React.useEffect(() => {
      notesStore.fetchNotes();
  }, []);

  const list = notesStore.notes;

  return (
    <Loader loading={notesStore.loading}>
      <NoContent
        show={list.length === 0}
        title={
          <div className="flex flex-col items-center justify-center">
            {/* <Icon name="no-dashboard" size={80} color="figmaColors-accent-secondary" /> */}
            <AnimatedSVG name={ICONS.NO_NOTES} size={180} />
            <div className="text-center mt-4">No notes yet.</div>
          </div>
        }
        subtext={
          <div className="text-center flex justify-center items-center flex-col">
            Note observations during session replays and share them with your team.
          </div>
        }
      >
        <div className="border-b rounded bg-white">
          {sliceListPerPage(list, notesStore.page - 1, notesStore.pageSize).map((note) => (
            <React.Fragment key={note.noteId}>
              <NoteItem note={note} />
            </React.Fragment>
          ))}
        </div>

        <div className="w-full flex items-center justify-between py-4 px-6">
          <div className="text-disabled-text">
            Showing{' '}
            <span className="font-semibold">{Math.min(list.length, notesStore.pageSize)}</span> out
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
    </Loader>
  );
}

export default observer(NotesList);
