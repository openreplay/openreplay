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
  const userName = userStore.account.name;
  const limited = kaiStore.usage.percent >= 100;
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
        onHide={hideModal}
        onSelect={(threadId: string, title: string) => {
          setTitle(title);
          setThreadId(threadId);
          hideModal();
        }}
      />,
      {
        right: true,
        width: 320,
        className: 'bg-none flex items-center h-screen',
      },
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
      kaiStore.setTitle(null);
      setSection('chat');
    } else {
      toast.error("Something wen't wrong. Please try again later.");
    }
  };

  const onCancel = () => {
    if (!threadId) return;
    void kaiStore.cancelGeneration({
      projectId: activeSiteId,
      threadId,
    });
  };

  return (
    <div
      className="w-full mx-auto h-full"
      style={{ maxWidth: PANEL_SIZES.maxWidth }}
    >
      <div
        className={
          'w-full rounded-lg overflow-hidden bg-white relative h-full reset'
        }
      >
        <ChatHeader
          chatTitle={chatTitle}
          openChats={openChats}
          goBack={goBack}
          onCreate={onCreate}
        />
        {section === 'intro' ? (
          <>
            <div
              className={
                'flex flex-col items-center justify-center py-4 relative'
              }
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: '100%',
                transform: 'translateY(-50%)',
              }}
            >
              <IntroSection
                onCancel={onCancel}
                onAsk={onCreate}
                projectId={activeSiteId}
                userName={userName}
                limited={limited}
              />
            </div>
            <div
              className={
                'text-disabled-text absolute bottom-4 left-0 right-0 text-center text-sm'
              }
            >
              OpenReplay AI can make mistakes. Verify its outputs.
            </div>
          </>
        ) : (
          <ChatLog
            threadId={threadId}
            projectId={activeSiteId}
            chatTitle={chatTitle}
            initialMsg={initialMsg}
            setInitialMsg={setInitialMsg}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

export default observer(KaiChat);
