import { Tooltip } from '@/ui/overlays/tooltip';
import { Eye, Play, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { liveSession, multiview, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

function Slot({
  kind,
  onClick,
  isDisabled,
}: {
  kind: 'current' | 'other' | 'empty';
  onClick?: () => void;
  isDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const label =
    kind === 'current'
      ? t('Watching this session')
      : kind === 'other'
        ? t('Switch to this session')
        : t('Add a session to the grid');
  return (
    <Tooltip title={label}>
      <button
        type="button"
        className={`m-live-slot is-${kind}`}
        aria-label={label}
        aria-current={kind === 'current' ? 'true' : undefined}
        disabled={isDisabled || kind === 'current'}
        onClick={onClick}
      >
        {kind === 'current' ? (
          <Eye size={12} />
        ) : kind === 'other' ? (
          <Play size={12} />
        ) : (
          <Plus size={12} />
        )}
      </button>
    </Tooltip>
  );
}

export const InactiveTab = React.memo(
  (props: { onClick?: () => void; isDisabled?: boolean }) => (
    <Slot kind="empty" onClick={props.onClick} isDisabled={props.isDisabled} />
  ),
);

function AssistTabs({ session }: { session: Record<string, any> }) {
  const history = useHistory();
  const { store } = React.useContext(
    PlayerContext,
  ) as unknown as ILivePlayerContext;
  const { recordingState, calling, remoteControl } = store.get();
  const isDisabled =
    recordingState !== 0 || calling !== 0 || remoteControl !== 0;

  const { assistMultiviewStore, projectsStore } = useStore();
  const siteId = projectsStore.siteId!;

  const placeholder = new Array(4 - assistMultiviewStore.sessions.length).fill(
    0,
  );

  React.useEffect(() => {
    if (assistMultiviewStore.sessions.length === 0) {
      assistMultiviewStore.setDefault(session);
    }
  }, []);

  const openGrid = () => {
    if (isDisabled) return;
    const sessionIdQuery = encodeURIComponent(
      assistMultiviewStore.sessions.map((s) => s?.sessionId).join(','),
    );
    return history.push(withSiteId(multiview(sessionIdQuery), siteId));
  };
  const openLiveSession = (sessionId: string) => {
    if (isDisabled) return;
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(liveSession(sessionId), siteId));
  };

  return (
    <div className="m-live-slots" role="group">
      {assistMultiviewStore.sortedSessions.map(
        (session: { key: number; sessionId: string }) => (
          <Slot
            key={session.key}
            kind={
              assistMultiviewStore.isActive(session.sessionId)
                ? 'current'
                : 'other'
            }
            isDisabled={isDisabled}
            onClick={() => openLiveSession(session.sessionId)}
          />
        ),
      )}
      {placeholder.map((_, i) => (
        <Slot key={i} kind="empty" isDisabled={isDisabled} onClick={openGrid} />
      ))}
    </div>
  );
}

export default observer(AssistTabs);
