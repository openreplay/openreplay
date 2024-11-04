import withPermissions from 'HOCs/withPermissions';
import React from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';

import { clearLogs } from 'App/dev/console';
import usePageTitle from 'App/hooks/usePageTitle';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute } from 'App/routes';
import MobilePlayer from 'Components/Session/MobilePlayer';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { clearCurrentSession, fetchV2 } from 'Duck/sessions';
import { Link, Loader, NoContent } from 'UI';

import WebPlayer from './WebPlayer';

const SESSIONS_ROUTE = sessionsRoute();

interface Props {
  sessionId: string;
  loading: boolean;
  hasErrors: boolean;
  fetchV2: (sessionId: string) => void;
  clearCurrentSession: () => void;
  session: Record<string, any>;
}

function Session({
  sessionId,
  hasErrors,
  fetchV2,
  clearCurrentSession,
  session,
}: Props) {
  usePageTitle('OpenReplay Session Player');
  const { sessionStore } = useStore();
  useEffect(() => {
    if (sessionId != null) {
      fetchV2(sessionId);
    } else {
      console.error('No sessionID in route.');
    }
    return () => {
      clearCurrentSession();
    };
  }, [sessionId]);

  useEffect(() => {
    clearLogs();
    sessionStore.resetUserFilter();
  }, []);

  const player = session.isMobileNative ? <MobilePlayer /> : <WebPlayer />;
  return (
    <NoContent
      show={hasErrors}
      title="Session not found."
      subtext={
        <span>
          {'Please check your data retention plan, or try '}
          <Link to={SESSIONS_ROUTE} className="link">
            {'another one'}
          </Link>
        </span>
      }
    >
      <Loader className="flex-1" loading={!session.sessionId}>
        {player}
      </Loader>
    </NoContent>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'], '', true, false
)(
  connect(
    (state: any, props: any) => {
      const {
        match: {
          params: { sessionId },
        },
      } = props;
      return {
        sessionId,
        loading: state.getIn(['sessions', 'loading']),
        hasErrors: !!state.getIn(['sessions', 'errors']),
        session: state.getIn(['sessions', 'current']),
      };
    },
    {
      fetchSlackList,
      fetchV2,
      clearCurrentSession,
    }
  )(Session)
);
