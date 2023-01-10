import React from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetch as fetchSession } from 'Duck/sessions';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { Loader } from 'UI';
import withPermissions from 'HOCs/withPermissions';
import LivePlayer from './LivePlayer';

function LiveSession({
  sessionId,
  loading,
  fetchSession,
  fetchSlackList,
  hasSessionsPath,
}) {
  usePageTitle('OpenReplay Assist');

  useEffect(() => {
    fetchSlackList();
  }, []);

  useEffect(() => {
    if (sessionId != null) {
      fetchSession(sessionId, true);
    } else {
      console.error('No sessionID in route.');
    }
  }, [sessionId, hasSessionsPath]);

  return (
    <Loader className="flex-1" loading={loading}>
      <LivePlayer />
    </Loader>
  );
}

export default withPermissions(
  ['ASSIST_LIVE'],
  '',
  true
)(
  connect(
    (state, props) => {
      const {
        match: {
          params: { sessionId },
        },
      } = props;
      const isAssist = state.getIn(['sessions', 'activeTab']).type === 'live';
      const hasSessiosPath = state
        .getIn(['sessions', 'sessionPath'])
        .pathname.includes('/sessions');
      return {
        sessionId,
        loading: state.getIn(['sessions', 'loading']),
        session: state.getIn(['sessions', 'current']),
        hasSessionsPath: hasSessiosPath && !isAssist,
      };
    },
    {
      fetchSession,
      fetchSlackList,
    }
  )(LiveSession)
);
