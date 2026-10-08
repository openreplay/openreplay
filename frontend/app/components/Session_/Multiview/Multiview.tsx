import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { ArrowLeft, Plus, Replace, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import LivePlayer from 'App/components/Session/LivePlayer';
import AssistSessionsModal from 'App/components/Session_/Player/Controls/AssistSessionsModal';
import { useStore } from 'App/mstore';
import { assist, liveSession, multiview, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';

import './multiview.css';

const SLOTS = 4;

/** Up to four live sessions side by side; a tile opens its session in full. */
function Multiview({ assistCredentials }: { assistCredentials: any }) {
  const { t } = useTranslation();
  const { assistMultiviewStore, projectsStore, searchStoreLive, sessionStore } =
    useStore();
  const siteId = projectsStore.siteId!;
  const history = useHistory();
  // @ts-ignore
  const { sessionsquery } = useParams();
  const total = sessionStore.totalLiveSessions;
  const [picker, setPicker] = React.useState<{
    open: boolean;
    replace?: string;
  }>({ open: false });

  const onSessionsChange = (
    sessions: Array<Record<string, any> | undefined>,
  ) => {
    const sessionIdQuery = encodeURIComponent(
      sessions.map((s) => s && s.sessionId).join(','),
    );
    return history.replace(withSiteId(multiview(sessionIdQuery), siteId));
  };

  React.useEffect(() => {
    assistMultiviewStore.setOnChange(onSessionsChange);
    if (sessionsquery) {
      const sessionIds = decodeURIComponent(sessionsquery).split(',');
      void assistMultiviewStore.presetSessions(sessionIds).then((data) => {
        sessionStore.customSetSessions(data);
      });
    } else {
      void searchStoreLive.fetchSessions();
    }
  }, []);

  const openLiveSession = (sessionId: string) => {
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(`${liveSession(sessionId)}?multi=true`, siteId));
  };

  const returnToList = () => {
    assistMultiviewStore.reset();
    history.push(withSiteId(assist(), siteId));
  };

  const empty = Math.max(0, SLOTS - assistMultiviewStore.sessions.length);

  return (
    <section className="m-mv">
      <header className="m-mv__head">
        <Button variant="subtle" onClick={returnToList}>
          <ArrowLeft size={14} />
          {t('CoBrowse')}
        </Button>
        <span className="m-mv__count">
          {t('Watching {{n}} of {{total}} live sessions', {
            n: assistMultiviewStore.sessions.length,
            total,
          })}
        </span>
      </header>
      <div className="m-mv__grid">
        {assistMultiviewStore.sortedSessions.map(
          (session: Record<string, any>) => (
            <div key={session.key} className="m-mv__tile">
              <button
                type="button"
                className="m-mv__stage"
                aria-label={t('Open {{name}} in full', {
                  name: session.userDisplayName,
                })}
                onClick={() => openLiveSession(session.sessionId)}
              >
                {session.agentToken ? (
                  <LivePlayer
                    isMultiview
                    customSession={session}
                    customAssistCredentials={assistCredentials}
                  />
                ) : (
                  <span className="m-mv__loading">{t('Loading session…')}</span>
                )}
              </button>
              <footer className="m-mv__foot">
                <span className="m-mv__who">{session.userDisplayName}</span>
                <IconButton
                  icon={<Replace size={14} />}
                  label={t('Replace session')}
                  variant="ghost"
                  onClick={() =>
                    setPicker({ open: true, replace: session.sessionId })
                  }
                />
                <IconButton
                  icon={<Trash2 size={14} />}
                  label={t('Remove from multiview')}
                  variant="ghost"
                  onClick={() =>
                    assistMultiviewStore.removeSession(session.sessionId)
                  }
                />
              </footer>
            </div>
          ),
        )}
        {Array.from({ length: empty }, (_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            className="m-mv__tile m-mv__empty"
            onClick={() => setPicker({ open: true })}
          >
            <Plus size={16} aria-hidden="true" />
            {t('Add a live session')}
          </button>
        ))}
      </div>
      <AssistSessionsModal
        open={picker.open}
        replaceTarget={picker.replace}
        onClose={() => setPicker({ open: false })}
      />
    </section>
  );
}

export default observer(Multiview);
