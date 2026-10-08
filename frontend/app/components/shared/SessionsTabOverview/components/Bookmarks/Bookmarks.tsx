import usePageTitle from '@/hooks/usePageTitle';
import { useStore } from '@/mstore';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import withPermissions from 'HOCs/withPermissions';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSessionQueue } from 'Shared/SessionsDock/openSessions';
import { SessionsTable } from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

function Bookmarks() {
  const { t } = useTranslation();
  const { sessionStore, userStore, settingsStore, projectsStore } = useStore();
  const queue = useSessionQueue(String(projectsStore.activeSiteId ?? ''));
  const { isEnterprise } = userStore;
  const { bookmarks, lastPlayedSessionId } = sessionStore;
  const { open, hover } = useOpenSession();

  usePageTitle(`${isEnterprise ? 'Vault' : 'Bookmarks'} - OpenReplay`);

  useEffect(() => {
    void sessionStore.fetchBookmarkedSessions();
  }, []);

  return (
    <PageCard
      title={isEnterprise ? t('Vault') : t('Bookmarks')}
      subtitle={
        isEnterprise
          ? t('Sessions kept past the retention period.')
          : t('Sessions you saved to come back to.')
      }
    >
      {bookmarks.loading && bookmarks.list.length === 0 ? (
        <SkeletonRows rows={6} />
      ) : bookmarks.list.length === 0 ? (
        <EmptyState
          art="bookmark"
          title={
            isEnterprise
              ? t('Nothing in the vault yet')
              : t('Nothing bookmarked yet')
          }
          hint={
            isEnterprise
              ? t(
                  'Extend the retention period of any session by adding it to your vault directly from the player screen.',
                )
              : t(
                  'Bookmark a session while watching it and it is kept here, for you.',
                )
          }
        />
      ) : (
        <>
          <SessionsTable
            rows={bookmarks.list}
            onOpen={open}
            queue={queue}
            onHover={hover}
            lastViewedId={lastPlayedSessionId}
            timezone={settingsStore.sessionSettings.timezone?.value}
          />
          <ListFooter
            page={bookmarks.page}
            pageSize={bookmarks.pageSize}
            total={bookmarks.total}
            noun={[t('session'), t('sessions')]}
            onPage={(page) => sessionStore.updateBookmarksPage(page)}
          />
        </>
      )}
    </PageCard>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  false,
  false,
)(observer(Bookmarks));
