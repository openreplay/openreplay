import React from 'react';
import ChatInput from './ChatInput';
import ChatMsg, { ChatNotice } from './ChatMsg';
import Ideas from './Ideas';
import { Loader } from 'UI';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';
import EmbedPlayer from './EmbedPlayer';

function ChatLog({
  projectId,
  threadId,
  initialMsg,
  chatTitle,
  setInitialMsg,
  onCancel,
}: {
  projectId: string;
  threadId: any;
  initialMsg: string | null;
  setInitialMsg: (msg: string | null) => void;
  chatTitle: string | null;
  onCancel: () => void;
}) {
  const [embedSession, setEmbedSession] = React.useState<any>(null);
  const messages = kaiStore.messages;
  const loading = kaiStore.loadingChat;
  const chatRef = React.useRef<HTMLDivElement>(null);
  const processingStage = kaiStore.processingStage;

  React.useEffect(() => {
    const settings = { projectId, threadId };
    if (threadId && !initialMsg) {
      void kaiStore.getChat(settings.projectId, threadId);
    }
    if (threadId) {
      kaiStore.createChatManager(settings, initialMsg);
    }
    return () => {
      kaiStore.clearChat();
      setInitialMsg(null);
    };
  }, [threadId]);

  const onSubmit = (text: string) => {
    kaiStore.sendMessage(text);
  };

  React.useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, processingStage]);

  const lastKaiMessageInd: number | null = kaiStore.lastKaiMessage.index;
  const lastHumanMsgInd: number | null = kaiStore.lastHumanMessage.index;
  const showIdeas =
    !processingStage && lastKaiMessageInd === messages.length - 1;
  return (
    <Loader loading={loading} className={'w-full h-full'}>
      <div
        ref={chatRef}
        style={{ maxHeight: 'calc(100svh - 165px)' }}
        className={
          'overflow-y-auto relative flex flex-col items-center justify-between w-full h-full pt-4'
        }
      >
        {embedSession ? (
          <EmbedPlayer
            session={embedSession}
            onClose={() => setEmbedSession(null)}
          />
        ) : null}
        <div className={'flex flex-col gap-2 w-2/3 min-h-max'}>
          {messages.map((msg, index) => (
            <React.Fragment key={msg.messageId ?? index}>
              <ChatMsg
                siteId={projectId}
                message={msg}
                chatTitle={chatTitle}
                onReplay={(session) => setEmbedSession(session)}
                canEdit={
                  processingStage === null &&
                  msg.isUser &&
                  index === lastHumanMsgInd
                }
              />
            </React.Fragment>
          ))}
          {processingStage ? (
            <ChatNotice
              content={processingStage.content}
              duration={processingStage.duration}
            />
          ) : null}
          {showIdeas ? (
            <Ideas
              onClick={(query) => onSubmit(query)}
              projectId={projectId}
              threadId={threadId}
              messageId={kaiStore.lastKaiMessage.msg?.messageId ?? null}
              inChat
            />
          ) : null}
        </div>
        <div className={'sticky bottom-0 pt-6 w-2/3 z-50'}>
          <ChatInput onCancel={onCancel} onSubmit={onSubmit} />
        </div>
      </div>
    </Loader>
  );
}

export default observer(ChatLog);
