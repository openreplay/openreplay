import React from 'react';
import { useModal } from 'App/components/Modal';
import { MessagesSquare, Trash } from 'lucide-react';
import ChatHeader from './components/ChatHeader';
import { PANEL_SIZES } from 'App/constants/panelSizes';
import ChatLog from './components/ChatLog';
import IntroSection from './components/IntroSection';
import { useQuery } from '@tanstack/react-query';
import { aiService } from 'App/services';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useHistory, useLocation } from 'react-router-dom'

function KaiChat() {
  const { userStore, projectsStore } = useStore();
  const history = useHistory();
  const [chatTitle, setTitle] = React.useState<string | null>(null);
  const userId = userStore.account.id;
  const userLetter = userStore.account.name[0].toUpperCase();
  const { activeSiteId } = projectsStore;
  const [section, setSection] = React.useState<'intro' | 'chat'>('intro');
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [initialMsg, setInitialMsg] = React.useState<string | null>(null);
  const { showModal, hideModal } = useModal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const threadIdFromUrl = params.get('threadId');

  const openChats = () => {
    showModal(
      <ChatsModal onSelect={(threadId: string, title: string) => {
        setTitle(title);
        setThreadId(threadId)
        hideModal();
      }} />,
      { right: true, width: 300 },
    );
  };

  React.useEffect(() => {
    if (threadIdFromUrl) {
      setThreadId(threadIdFromUrl);
      setSection('chat');
    }
  }, [threadIdFromUrl])

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
  const goBack = canGoBack ? () => {
    if (section === 'chat') {
      setThreadId(null);
      setSection('intro')
    }
  } : undefined;

  const onCreate = async (firstMsg?: string) => {
    //const settings = { projectId: projectId ?? 2325, userId: userId ?? 65 };
    const settings = { projectId: '2325', userId: '0' };
    if (firstMsg) {
      setInitialMsg(firstMsg);
    }
    const newThread = await aiService.createKaiChat(settings.projectId, settings.userId)
    if (newThread) {
      setThreadId(newThread.toString());
      setSection('chat');
    } else {
      toast.error("Something wen't wrong. Please try again later.");
    }
  }
  return (
    <div className="w-full mx-auto" style={{ maxWidth: PANEL_SIZES.maxWidth }}>
      <div className={'w-full rounded-lg overflow-hidden border shadow'}>
        <ChatHeader chatTitle={chatTitle} openChats={openChats} goBack={goBack} />
        <div
          className={
            'w-full bg-active-blue flex flex-col items-center justify-center py-4 relative'
          }
          style={{
            height: '70svh',
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0.50) 0%, rgba(248, 255, 254, 0.50) 46%, rgba(243, 241, 255, 0.50) 100%)',
          }}
        >
          {section === 'intro' ? (
            <IntroSection onAsk={onCreate} />
          ) : (
            <ChatLog
              threadId={threadId}
              projectId={activeSiteId}
              userId={userId}
              userLetter={userLetter}
              onTitleChange={setTitle}
              initialMsg={initialMsg}
              setInitialMsg={setInitialMsg}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatsModal({ onSelect }: { onSelect: (threadId: string, title: string) => void }) {
  const userId = '0';
  const projectId = '2325';
  const {
    data = [],
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['kai', 'chats'],
    queryFn: () => aiService.getKaiChats(userId, projectId),
    staleTime: 1000 * 60,
    cacheTime: 1000 * 60 * 5,
  });

  const onDelete = async (id: string) => {
    try {
      await aiService.deleteKaiChat(projectId, userId, id);
    } catch (e) {
      toast.error("Something wen't wrong. Please try again later.");
    }
    refetch();
  };
  return (
    <div className={'h-screen w-full flex flex-col gap-2 p-4'}>
      <div className={'flex items-center font-semibold text-lg gap-2'}>
        <MessagesSquare size={16} />
        <span>Chats</span>
      </div>
      {isPending ? (
        <div className="animate-pulse text-disabled-text">Loading chats...</div>
      ) : (
        <div className="flex flex-col overflow-y-auto -mx-4 px-4">
          {data.map((chat) => (
            <div key={chat.thread_id} className="flex items-center relative group min-h-8">
              <div
                style={{ width: 270 - 28 - 4 }}
                className="rounded-l pl-2 h-full w-full hover:bg-active-blue flex items-center"
              >
                <div
                  onClick={() => onSelect(chat.thread_id, chat.title)}
                  className="cursor-pointer hover:underline truncate"
                >
                  {chat.title}
                </div>
              </div>
              <div
                onClick={() => onDelete(chat.thread_id)}
                className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-r h-full px-2 flex items-center group-hover:bg-active-blue"
              >
                <Trash size={14} className="text-disabled-text" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default observer(KaiChat);
