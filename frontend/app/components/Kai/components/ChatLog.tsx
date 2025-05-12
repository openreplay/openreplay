import React from 'react';
import ChatInput from './ChatInput';
import { ChatMsg, ChatNotice } from './ChatMsg';
import { Loader } from 'UI';
import { kaiStore } from '../KaiStore'
import { observer } from 'mobx-react-lite';

function ChatLog({
  projectId,
  userId,
  threadId,
  userLetter,
  onTitleChange,
  initialMsg,
  setInitialMsg,
}: {
  projectId: string;
  userId: string;
  threadId: any;
  userLetter: string;
  onTitleChange: (title: string | null) => void;
  initialMsg: string | null;
  setInitialMsg: (msg: string | null) => void;
}) {
  const messages = kaiStore.messages;
  const loading = kaiStore.loadingChat;
  const chatRef = React.useRef<HTMLDivElement>(null);
  const processingStage = kaiStore.processingStage;

  React.useEffect(() => {
    const settings = { projectId, threadId };
    if (threadId && !initialMsg) {
      void kaiStore.getChat(settings.projectId, threadId)
    }
    if (threadId) {
      kaiStore.createChatManager(settings, onTitleChange, initialMsg)
    }
    return () => {
      kaiStore.clearChat();
      setInitialMsg(null);
    };
  }, [threadId]);

  const onSubmit = (text: string) => {
    kaiStore.sendMessage(text)
  };

  React.useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, processingStage]);

  const lastHumanMsgInd: null | number = kaiStore.lastHumanMessage.index;
  return (
    <Loader loading={loading} className={'w-full h-full'}>
      <div
        ref={chatRef}
        className={
          'overflow-y-auto relative flex flex-col items-center justify-between w-full h-full'
        }
      >
        <div className={'flex flex-col gap-4 w-2/3 min-h-max'}>
          {messages.map((msg, index) => (
            <ChatMsg
              key={index}
              text={msg.text}
              isUser={msg.isUser}
              userName={userLetter}
              messageId={msg.messageId}
              isLast={index === lastHumanMsgInd}
              duration={msg.duration}
            />
          ))}
          {processingStage ? (
            <ChatNotice content={processingStage.content} duration={processingStage.duration} />
          ) : null}
        </div>
        <div className={'sticky bottom-0 pt-6 w-2/3'}>
          <ChatInput onSubmit={onSubmit} threadId={threadId} />
        </div>
      </div>
    </Loader>
  );
}

export default observer(ChatLog);
