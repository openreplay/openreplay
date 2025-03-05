import React from 'react';
import { NoContent, Pagination, Loader } from 'UI';
import { sliceListPerPage } from 'App/utils';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import NoteTags from 'Shared/SessionsTabOverview/components/Notes/NoteTags';
import withPermissions from 'HOCs/withPermissions';
import usePageTitle from '@/hooks/usePageTitle';
import NoteItem from './NoteItem';
import { useTranslation } from 'react-i18next';

function NotesList() {
  const { t } = useTranslation();
  usePageTitle(t('Notes - OpenReplay'));
  const { notesStore } = useStore();

  React.useEffect(() => {
    void notesStore.fetchNotes();
  }, [notesStore.page]);

  const list = notesStore.notes;

  return (
    <div className="widget-wrapper">
      <div className="flex items-center px-4 py-1 justify-between w-full">
        <h2 className="text-2xl capitalize mr-4">{t('Notes')}</h2>

        <div className="flex items-center justify-end w-full">
          <NoteTags />
        </div>
      </div>
      <div className="border-b" />
      <Loader loading={notesStore.loading}>
        <NoContent
          show={list.length === 0}
          title={
            <div className="flex flex-col items-center justify-center">
              {/* <Icon name="no-dashboard" size={80} color="figmaColors-accent-secondary" /> */}
              <AnimatedSVG name={ICONS.NO_NOTES} size={60} />
              <div className="text-center mt-4 text-lg font-medium">
                {t('No notes yet')}
              </div>
            </div>
          }
          subtext={
            <div className="text-center flex justify-center items-center flex-col">
              {t(
                'Note observations during session replays and share them with your team.',
              )}
            </div>
          }
        >
          <div className="border-b rounded bg-white">
            {list.map((note) => (
              <React.Fragment key={note.noteId}>
                <NoteItem note={note} />
              </React.Fragment>
            ))}
          </div>

          <div className="w-full flex items-center justify-between py-4 px-6">
            <div className="text-disabled-text">
              {t('Showing')}{' '}
              <span className="font-semibold">
                {Math.min(list.length, notesStore.pageSize)}
              </span>{' '}
              {t('out of')}
              <span className="font-semibold">{notesStore.total}</span>&nbsp;
              {t('notes')}
            </div>
            <Pagination
              page={notesStore.page}
              total={notesStore.total}
              onPageChange={(page) => notesStore.changePage(page)}
              limit={notesStore.pageSize}
              debounceRequest={100}
            />
          </div>
        </NoContent>
      </Loader>
    </div>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  false,
  false,
)(observer(NotesList));
