import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import type Session from 'Types/session';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { LiveSection } from 'App/components/Assist/CoBrowsePage';
import { useStore } from 'App/mstore';

interface Props {
  open: boolean;
  onClose: () => void;
  /** replace this tile's session instead of filling an empty one */
  replaceTarget?: string;
}

/** Pick a live session for a multiview tile: the CoBrowse live list in a drawer. */
function AssistSessionsModal({ open, onClose, replaceTarget }: Props) {
  const { t } = useTranslation();
  const { assistMultiviewStore } = useStore();

  const pick = (session: Session) => {
    if (replaceTarget)
      assistMultiviewStore.replaceSession(replaceTarget, session);
    else assistMultiviewStore.addSession(session);
    void assistMultiviewStore
      .fetchAgentTokenInfo(session.sessionId)
      .then(onClose);
  };
  const picked = (session: Session) =>
    assistMultiviewStore.sessions.some(
      (s) => s?.sessionId === session.sessionId,
    );

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow={t('Multiview')}
      title={replaceTarget ? t('Replace a session') : t('Add a live session')}
    >
      <div className="m-mv__picker">
        <LiveSection onPick={pick} isPicked={picked} />
      </div>
    </EntityDrawer>
  );
}

export default observer(AssistSessionsModal);
