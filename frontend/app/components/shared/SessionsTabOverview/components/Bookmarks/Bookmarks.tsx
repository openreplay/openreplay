import React, { useEffect } from 'react';
import SessionList from 'Shared/SessionsTabOverview/components/SessionList/SessionList';
import NoteTags from 'Shared/SessionsTabOverview/components/Notes/NoteTags';
import { Loader, NoContent, Pagination } from 'UI';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import NoteItem from 'Shared/SessionsTabOverview/components/Notes/NoteItem';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import SessionItem from 'Shared/SessionItem/SessionItem';
import usePageTitle from '@/hooks/usePageTitle';
import withPermissions from 'HOCs/withPermissions';
import { useTranslation } from 'react-i18next';

function Bookmarks() {
  const { t } = useTranslation();
  const {
    projectsStore,
    sessionStore,
    customFieldStore,
    userStore,
    searchStore,
  } = useStore();
  const { isEnterprise } = userStore;
  const { isLoggedIn } = userStore;
  const { bookmarks } = sessionStore;

  usePageTitle('Bookmarks - OpenReplay');

  useEffect(() => {
    void sessionStore.fetchBookmarkedSessions();
  }, []);

  return (
    <div className="widget-wrapper">
      <div className="flex items-center px-4 py-1 justify-between w-full">
        <h2 className="text-2xl capitalize mr-4">{t('Bookmarks')}</h2>
      </div>
      <div className="border-b" />
      <Loader loading={bookmarks.loading}>
        <NoContent
          show={bookmarks.list.length === 0}
          title={
            <div className="flex flex-col items-center justify-center">
              {/* <Icon name="no-dashboard" size={80} color="figmaColors-accent-secondary" /> */}
              <AnimatedSVG name={ICONS.NO_BOOKMARKS} size={60} />
              <div className="text-center mt-4 text-lg font-medium">
                {t('No sessions bookmarked')}
              </div>
            </div>
          }
        >
          <div className="border-b rounded bg-white">
            {bookmarks.list.map((session: any) => (
              <div key={session.sessionId} className="border-b">
                <SessionItem
                  session={session}
                  hasUserFilter={false}
                  // onUserClick={() => {}}
                  // metaList={metaList}
                  // lastPlayedSessionId={lastPlayedSessionId}
                  bookmarked
                  // toggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>

          <div className="w-full flex items-center justify-between py-4 px-6">
            <div className="text-disabled-text">
              {t('Showing')}{' '}
              <span className="font-semibold">
                {Math.min(bookmarks.list.length, bookmarks.pageSize)}
              </span>{' '}
              {t('out of')}
              <span className="font-semibold">{bookmarks.total}</span>&nbsp;
              {t('sessions')}.
            </div>
            <Pagination
              page={bookmarks.page}
              total={bookmarks.total}
              onPageChange={(page) => sessionStore.updateBookmarksPage(page)}
              limit={bookmarks.pageSize}
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
)(observer(Bookmarks));
