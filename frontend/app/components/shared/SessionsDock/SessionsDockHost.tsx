import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { useStore } from 'App/mstore';
import {
  session as sessionRoute,
  sessions as sessionsRoute,
  withSiteId,
} from 'App/routes';
import { useHistory, useLocation } from 'App/routing';

import { SessionsDock } from './SessionsDock';
import {
  clearSessionTabs,
  closeSessionTab,
  neighbourOf,
  openSessionTab,
  snapshotOf,
  useOpenSessions,
} from './openSessions';

const REPLAY = /^\/[^/]+\/session\/([^/?#]+)/;
const LIST = /^\/[^/]+\/(sessions|bookmarks)\/?$/;

/**
 * Mounted once in the app shell so the same dock survives moving between the
 * sessions list and a replay (and between replays): it only shows on those
 * routes, and a replay that has loaded joins the queue.
 */
function SessionsDockHost() {
  const { pathname } = useLocation();
  const history = useHistory();
  const { sessionStore, projectsStore } = useStore();
  const rows = useOpenSessions();
  const replayId = REPLAY.exec(pathname)?.[1] ?? null;
  const onList = LIST.test(pathname);
  const current = sessionStore.current;
  const siteId = String(projectsStore.activeSiteId ?? '');

  const loadedId =
    replayId && current?.sessionId === replayId ? current.sessionId : null;
  useEffect(() => {
    if (loadedId) openSessionTab(snapshotOf(current, siteId));
  }, [loadedId]);

  if (!replayId && !onList) return null;

  const toList = () => history.push(withSiteId(sessionsRoute(), siteId));
  return (
    <SessionsDock
      rows={rows}
      currentId={replayId}
      overReplay={replayId != null}
      onPick={(s) => {
        if (s.id !== replayId)
          history.push(withSiteId(sessionRoute(s.id), s.siteId || siteId));
      }}
      onClose={(id) => {
        const next = neighbourOf(id);
        closeSessionTab(id);
        if (id !== replayId) return;
        if (next)
          history.push(
            withSiteId(sessionRoute(next.id), next.siteId || siteId),
          );
        else toList();
      }}
      onClear={() => {
        clearSessionTabs();
        if (replayId) toList();
      }}
    />
  );
}

export default observer(SessionsDockHost);
