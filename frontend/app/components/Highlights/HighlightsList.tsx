import React from 'react';
import { observer } from 'mobx-react-lite';
import { iTag } from 'App/services/NotesService';
import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Pagination, NoContent, Loader } from 'UI';
import cn from 'classnames';
import { withSiteId, highlights } from 'App/routes';
import HighlightClip from './HighlightClip';
import { useQuery } from '@tanstack/react-query';
import HighlightPlayer from './HighlightPlayer';
import { useLocation, useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import EditHlModal from './EditHlModal';
import HighlightsListHeader from './HighlightsListHeader';
import withPermissions from 'HOCs/withPermissions';

function HighlightsList() {
  const { notesStore, projectsStore } = useStore();
  const hist = useHistory();
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editHl, setEditHl] = React.useState<Record<string, any>>({
    message: '',
    isPublic: false
  });
  const { search } = useLocation();
  const highlight = new URLSearchParams(search).get('highlight');

  const query = notesStore.query;
  const limit = notesStore.pageSize;
  const listLength = notesStore.notes.length;
  const activeTags = notesStore.activeTags;
  const page = notesStore.page;
  const ownOnly = notesStore.ownOnly;
  const {
    data = { notes: [], total: 0 },
    isPending,
    refetch
  } = useQuery({
    queryKey: ['notes', page, query, activeTags],
    queryFn: () => notesStore.fetchNotes(),
    retry: 3
  });
  const { total, notes } = data;
  const debounceTimeout = React.useRef(0);

  const onSearch = (value: string) => {
    notesStore.setQuery(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = window.setTimeout(() => {
      notesStore.setQuery(value);
    }, 500);
  };

  const toggleTag = (tag?: iTag) => {
    notesStore.toggleTag(tag);
  };

  const onPageChange = (page: number) => {
    notesStore.changePage(page);
  };

  const onDelete = async (id: number) => {
    await notesStore.deleteNote(id);
    refetch();
    toast.success('Highlight deleted successfully');
  };

  const onItemClick = (id: string) => {
    hist.replace(`?highlight=${id}`);
  };

  const onClose = () => {
    hist.replace(withSiteId(highlights(), projectsStore.active?.id));
  };

  const onEdit = (id: string) => {
    const hl = notesStore.getNoteById(id);
    if (!hl) {
      return toast.error('Highlight not found in the list');
    }
    setEditHl(hl);
    setEditModalOpen(true);
  };

  const onSave = async (noteText: string, visible: boolean) => {
    if (!editHl) {
      return;
    }
    const newNote = {
      ...editHl,
      message: noteText,
      isPublic: visible
    };
    try {
      await notesStore.updateNote(editHl.noteId, newNote);
      toast.success('Highlight updated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Error updating highlight');
    }

    setEditModalOpen(false);
  };

  const toggleShared = (val: boolean) => {
    notesStore.toggleShared(val);
    refetch();
  };

  const isEmpty = !isPending && total === 0;
  return (
    <div
      className={'relative w-full mx-auto bg-white rounded-lg'}
      style={{ maxWidth: 1360 }}
    >
      {highlight && <HighlightPlayer onClose={onClose} hlId={highlight} />}
      <HighlightsListHeader
        activeTags={activeTags}
        ownOnly={ownOnly}
        onSearch={onSearch}
        handleInputChange={handleInputChange}
        toggleTag={toggleTag}
        toggleShared={toggleShared}
        query={query}
      />
      <div
        className={cn(
          'py-2 px-4 border-gray-lighter',
          isEmpty
            ? 'h-96 flex items-center justify-center'
            : ' grid grid-cols-3 gap-6'
        )}
      >
        <Loader loading={isPending}>
          <NoContent
            show={isEmpty}
            subtext={
              <div className={'w-full text-center'}>
                Highlight and note observations during session replays and share
                them with your team.
              </div>
            }
          >
            {notes.map((note) => (
              <HighlightClip
                note={note.message}
                tag={note.tag}
                user={note.userName}
                createdAt={note.createdAt}
                hId={note.noteId}
                thumbnail={note.thumbnail}
                openEdit={() => onEdit(note.noteId)}
                onDelete={() => onDelete(note.noteId)}
                onItemClick={() => onItemClick(note.noteId)}
              />
            ))}
          </NoContent>
        </Loader>
        <EditHlModal
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          text={editHl?.message}
          visible={editHl?.isPublic}
          onSave={onSave}
        />
      </div>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2',
          isEmpty ? 'hidden' : 'visible'
        )}
      >
        <div>
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span>
          {' to '}
          <span className="font-medium">{(page - 1) * limit + listLength}</span>
          {' of '}
          <span className="font-medium">{numberWithCommas(total)}</span>
          {' highlights'}.
        </div>
        <Pagination
          page={page}
          total={total}
          onPageChange={onPageChange}
          limit={limit}
          debounceRequest={250}
        />
      </div>
    </div>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'], '', false, false
)(observer(HighlightsList));
