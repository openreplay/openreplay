import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import {
  assist as assistRoute,
  sessions as sessionsRoute,
  withSiteId,
} from 'App/routes';
import { RouteComponentProps, withRouter } from 'App/routing';

const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();

interface Props extends RouteComponentProps {
  history: any;
  isLive?: boolean;
}
function NoSessionPermission(props: Props) {
  const { t } = useTranslation();
  const { projectsStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const { sessionPath } = sessionStore;
  const isAssist = window.location.pathname.includes('/assist/');
  const siteId = projectsStore.siteId!;
  const { history } = props;

  const backHandler = () => {
    if (
      sessionPath.pathname === history.location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      isAssist
    ) {
      history.push(
        withSiteId(isAssist ? ASSIST_ROUTE : SESSIONS_ROUTE, siteId),
      );
    } else {
      history.push(
        sessionPath
          ? sessionPath.pathname + sessionPath.search
          : withSiteId(SESSIONS_ROUTE, siteId),
      );
    }
  };

  return (
    <EmptyState
      state="no-access"
      title={t('Your role has no access here')}
      hint={
        session.isLive
          ? t(
              'This session is still live, and your role cannot watch live sessions. Ask an admin to add it in Team.',
            )
          : t(
              'An admin sets what each role can open, in Team. Ask one to add this to yours.',
            )
      }
      action={
        <Button variant="primary" onClick={backHandler}>
          {t('Go back')}
        </Button>
      }
    />
  );
}

export default withRouter(observer(NoSessionPermission));
