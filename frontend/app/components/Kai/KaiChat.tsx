import React from 'react';
import { useModal } from 'App/components/Modal';
import ChatHeader from './components/ChatHeader';
import { PANEL_SIZES } from 'App/constants/panelSizes';
import ChatLog from './components/ChatLog';
import IntroSection from './components/IntroSection';
import { kaiService } from 'App/services';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useHistory, useLocation } from 'react-router-dom';
import ChatsModal from './components/ChatsModal';
import { kaiStore } from './KaiStore';

function KaiChat() {
  const { userStore, projectsStore } = useStore();
  const history = useHistory();
  const chatTitle = kaiStore.chatTitle;
  const setTitle = kaiStore.setTitle;
  const userId = userStore.account.id;
  const userLetter = userStore.account.name[0].toUpperCase();
  const { activeSiteId } = projectsStore;
  const [section, setSection] = React.useState<'intro' | 'chat'>('intro');
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [initialMsg, setInitialMsg] = React.useState<string | null>(null);
  const { showModal, hideModal } = useModal();
  const location = useLocation();

  React.useEffect(() => {
    history.replace({ search: '' });
    setThreadId(null);
    setSection('intro');
    setInitialMsg(null);
    setTitle(null);
  }, [activeSiteId, history]);

  const openChats = () => {
    showModal(
      <ChatsModal
        projectId={activeSiteId!}
        onSelect={(threadId: string, title: string) => {
          setTitle(title);
          setThreadId(threadId);
          hideModal();
        }}
      />,
      { right: true, width: 300 },
    );
  };

  React.useEffect(() => {
    if (
      activeSiteId &&
      parseInt(activeSiteId, 10) !==
        parseInt(location.pathname.split('/')[1], 10)
    ) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const threadIdFromUrl = params.get('threadId');
    if (threadIdFromUrl) {
      setThreadId(threadIdFromUrl);
      setSection('chat');
    }
  }, []);

  React.useEffect(() => {
    if (threadId) {
      setSection('chat');
      history.replace({ search: `?threadId=${threadId}` });
    } else {
      setTitle(null);
      history.replace({ search: '' });
    }
  }, [threadId]);

  if (!userId || !activeSiteId) return null;

  const canGoBack = section !== 'intro';
  const goBack = canGoBack
    ? () => {
        if (section === 'chat') {
          setThreadId(null);
          setSection('intro');
        }
      }
    : undefined;

  const onCreate = async (firstMsg?: string) => {
    if (firstMsg) {
      setInitialMsg(firstMsg);
    }
    const newThread = await kaiService.createKaiChat(activeSiteId);
    if (newThread) {
      setThreadId(newThread.toString());
      setSection('chat');
    } else {
      toast.error("Something wen't wrong. Please try again later.");
    }
  };
  return (
    <div className="w-full mx-auto" style={{ maxWidth: PANEL_SIZES.maxWidth }}>
      <div
        className={'w-full rounded-lg overflow-hidden border shadow relative'}
      >
        <ChatHeader
          chatTitle={chatTitle}
          openChats={openChats}
          goBack={goBack}
        />
        <div
          className={
            'w-full bg-active-blue flex flex-col items-center justify-center py-4 relative'
          }
          style={{
            height: '70svh',
            background:
              'radial-gradient(50% 50% at 50% 50%, var(--color-glassWhite) 0%, var(--color-glassMint) 46%, var(--color-glassLavander) 100%)',
          }}
        >
          {section === 'intro' ? (
              <IntroSection onAsk={onCreate} projectId={activeSiteId} />
          ) : (
            <ChatLog
              threadId={threadId}
              projectId={activeSiteId}
              userLetter={userLetter}
              chatTitle={chatTitle}
              initialMsg={initialMsg}
              setInitialMsg={setInitialMsg}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(KaiChat);
