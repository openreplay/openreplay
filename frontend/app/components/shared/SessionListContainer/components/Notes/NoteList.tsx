import React from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { sliceListPerPage } from 'App/utils';
import NoteItem from './NoteItem';

//{ siteId }: { siteId: string }
function NotesList() {
  const list = [
    {
      author: 'nikita@openreplay.com',
      date: 'Today, 12.00PM',
      tag: 1,
      isPrivate: true,
      description: 'Testing private note stuff bla bla bla',
      sessionId: '123123123',
      id: 2,
    },
    {
      author: 'sasha@openreplay.com',
      date: 'Tomorrow, 12.00PM',
      tag: 0,
      isPrivate: false,
      description: 'Not Testing team note stuff bla bla bla',
      sessionId: '123123123',
      id: 1,
    },
  ];

  const store = {
    page: 1,
    pageSize: 10,
    // @ts-ignore
    updateKey: (a, b) => 1,
  };

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
        {sliceListPerPage(list, store.page - 1, store.pageSize).map((note) => (
          <React.Fragment key={note.id}>
            <NoteItem
              author={note.author}
              tag={note.tag}
              date={note.date}
              isPrivate={note.isPrivate}
              description={note.description}
              sessionId={note.sessionId}
            />
          </React.Fragment>
        ))}
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
        <div className="text-disabled-text">
          Showing <span className="font-semibold">{Math.min(list.length, store.pageSize)}</span> out
          of <span className="font-semibold">{list.length}</span> notes
        </div>
        <Pagination
          page={store.page}
          totalPages={Math.ceil(list.length / store.pageSize)}
          onPageChange={(page) => store.updateKey('page', page)}
          limit={store.pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default NotesList;
