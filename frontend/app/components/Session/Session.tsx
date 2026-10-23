import { trackerInstance } from '@/init/openreplay';
import { Loader } from '@/ui/feedback/Loader';
import withPermissions from 'HOCs/withPermissions';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { clearLogs } from 'App/dev/console';
import usePageTitle from 'App/hooks/usePageTitle';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import MobilePlayer from 'Components/Session/MobilePlayer';

import PhoneHorizontalWarn from './Player/SharedComponents/PhoneHorizontal';
import SessionNotFound from './SessionNotFound';
import WebPlayer from './WebPlayer';

const SESSIONS_ROUTE = sessionsRoute();

function Session({
  match: {
    params: { sessionId },
  },
}: {
  match: any;
}) {
  const { t } = useTranslation();
  usePageTitle('OpenReplay Session Player');
  const { sessionStore, projectsStore } = useStore();
  const history = useHistory();
  const hasErrors = sessionStore.fetchFailed;
  const session = sessionStore.current;
  const fetchV2 = sessionStore.fetchSessionData;
  const { clearCurrentSession } = sessionStore;

  // the previous session stays current until the next one arrives, so moving
  // between sessions keeps the screen (and its panels) instead of reloading it
  useEffect(() => {
    if (sessionId != null) {
      trackerInstance.event('session_opened', { sessionId });
      void fetchV2(sessionId);
    } else {
      console.error('No sessionID in route.');
    }
  }, [sessionId]);
  useEffect(() => () => clearCurrentSession(), []);

  useEffect(() => {
    clearLogs();
    sessionStore.resetUserFilter();
  }, []);

  const player = session.isMobileNative ? <MobilePlayer /> : <WebPlayer />;
  if (hasErrors)
    return (
      <SessionNotFound
        id={String(sessionId)}
        onBack={() =>
          history.push(withSiteId(SESSIONS_ROUTE, projectsStore.siteId!))
        }
        onRetry={() => void fetchV2(sessionId)}
      />
    );
  return (
    <>
      <PhoneHorizontalWarn />
      <Loader className="flex-1" loading={!session.sessionId}>
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {player}
        </div>
      </Loader>
    </>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  true,
  false,
)(observer(Session));
