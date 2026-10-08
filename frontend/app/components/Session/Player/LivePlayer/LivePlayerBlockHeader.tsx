import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { assist as assistRoute, multiview, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import AssistActions from 'Components/Assist/components/AssistActions';

/** Where the header's back goes: the multiview grid when one is open, else back. */
export function useLiveBack(isMultiview?: boolean) {
  const { t } = useTranslation();
  const history = useHistory();
  const { assistMultiviewStore, projectsStore } = useStore();
  const hidden = React.useMemo(() => {
    const q = new URLSearchParams(document.location.search);
    return q.get('iframe') === 'true';
  }, []);
  if (hidden) return undefined;
  const grid = assistMultiviewStore.sessions.length > 1 || isMultiview;
  return {
    label: grid ? t('Close') : t('CoBrowse'),
    onClick: () => {
      if (grid) {
        const ids = encodeURIComponent(
          assistMultiviewStore.sessions.map((s) => s?.sessionId).join(','),
        );
        history.push(withSiteId(multiview(ids), projectsStore.siteId!));
      } else if (window.history.length > 1) {
        history.goBack();
      } else {
        history.push(withSiteId(assistRoute(), projectsStore.siteId!));
      }
    },
  };
}

/** Call, control and annotation, while the visitor is still live. */
function LiveActions() {
  const { sessionStore } = useStore();
  const isAssist = window.location.pathname.includes('/assist/');
  const session = sessionStore.current;
  const closedLive = sessionStore.fetchFailed || (isAssist && !session.live);
  if (closedLive) return null;
  const { userId, isCallActive, agentIds } = session;
  return (
    <AssistActions
      userId={userId}
      isCallActive={!!isCallActive}
      agentIds={agentIds ?? []}
      userDisplayName={session.userDisplayName ?? ''}
    />
  );
}

export default observer(LiveActions);
