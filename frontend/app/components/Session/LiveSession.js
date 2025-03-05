import React, { useEffect } from 'react';
import usePageTitle from 'App/hooks/usePageTitle';
import { Loader } from 'UI';
import withPermissions from 'HOCs/withPermissions';
import { clearLogs } from 'App/dev/console';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import LivePlayer from './LivePlayer';

function LiveSession({
  match: {
    params: { sessionId },
  },
}) {
  const { integrationsStore, sessionStore } = useStore();
  const session = sessionStore.current;
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
