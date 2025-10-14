import React, { useEffect } from 'react';
import usePageTitle from 'App/hooks/usePageTitle';
import { Loader } from 'UI';
import withPermissions from 'HOCs/withPermissions';
import { clearLogs } from 'App/dev/console';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import LivePlayer from './LivePlayer';
import { useHistory } from 'react-router';
import { liveSession, withSiteId } from 'App/routes';

function LiveSession({
  match: {
    params: { sessionId },
  },
}) {
  const history = useHistory();
  const { integrationsStore, sessionStore, projectsStore } = useStore();
  const session = sessionStore.current;
  const currentSessionId = session.sessionId;
  const { fetchFailed } = sessionStore;
  const { clearCurrentSession } = sessionStore;
  const fetchSlackList = integrationsStore.slack.fetchIntegrations;
  const fetchSession = sessionStore.fetchSessionData;
  const [initialLoading, setInitialLoading] = React.useState(true);
  usePageTitle('OpenReplay Assist');

  useEffect(() => {
    clearLogs();
    void fetchSlackList();

    return () => {
      clearCurrentSession();
    };
  }, []);

  useEffect(() => {
    if (sessionId != null) {
      void fetchSession(sessionId, true);
    } else {
      console.error('No sessionID in route.');
    }
  }, [sessionId]);

  useEffect(() => {
    if (fetchFailed) {
      toast.error('Error getting live session');
      setInitialLoading(false);
    }
    if (session.sessionId) {
      setInitialLoading(false);
    }
  }, [session.sessionId, fetchFailed]);

  useEffect(() => {
    if (currentSessionId && sessionId) {
      if (currentSessionId !== sessionId) {
        const newUrl = withSiteId(
          liveSession(currentSessionId, projectsStore.activeSiteId),
        );
        history.replace(newUrl);
      }
    }
  }, [currentSessionId]);

  return (
    <Loader className="flex-1" loading={initialLoading}>
      {session.sessionId && <LivePlayer />}
    </Loader>
  );
}

export default withPermissions(
  ['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'],
  '',
  true,
  false,
)(observer(LiveSession));
