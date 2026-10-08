import { trackerInstance } from '@/init/openreplay';
import { Loader } from '@/ui/feedback/Loader';
import { NoContent } from '@/ui/feedback/NoContent';
import withPermissions from 'HOCs/withPermissions';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { clearLogs } from 'App/dev/console';
import usePageTitle from 'App/hooks/usePageTitle';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute } from 'App/routes';
import MobilePlayer from 'Components/Session/MobilePlayer';

import Link from 'Shared/Link/Link';

import PhoneHorizontalWarn from './Player/SharedComponents/PhoneHorizontal';
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
  const { sessionStore } = useStore();
  const hasErrors = sessionStore.fetchFailed;
  const session = sessionStore.current;
  const fetchV2 = sessionStore.fetchSessionData;
  const { clearCurrentSession } = sessionStore;

  useEffect(() => {
    if (sessionId != null) {
      trackerInstance.event('session_opened', { sessionId });
      void fetchV2(sessionId);
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
      title={t('Session not found.')}
      subtext={
        <span>
          {'Please check your data retention plan, or try '}
          <Link to={SESSIONS_ROUTE} className="link">
            {t('another one')}
          </Link>
        </span>
      }
    >
      <PhoneHorizontalWarn />
      <Loader className="flex-1" loading={!session.sessionId}>
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {player}
        </div>
      </Loader>
    </NoContent>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  true,
  false,
)(observer(Session));
