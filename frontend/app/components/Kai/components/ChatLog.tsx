import React from 'react';
import ChatInput from './ChatInput';
import { ChatMsg, ChatNotice } from './ChatMsg';
import { ChatManager } from '../SocketManager';
import type { BotChunk, Message } from '../SocketManager';
import { aiService } from 'App/services';
import { toast } from 'react-toastify';
import { Loader } from 'UI';

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
  const chatManager = React.useRef<ChatManager | null>(null);
  const chatRef = React.useRef<HTMLDivElement>(null);
  const [messages, setMessages] = React.useState<Message[]>(
    initialMsg ? [{ text: initialMsg, isUser: true }] : [],
  );
  const [processingStage, setProcessing] = React.useState<BotChunk | null>(
    null,
  );
  const [isLoading, setLoading] = React.useState(false);

  React.useEffect(() => {
    //const settings = { projectId: projectId ?? 2325, userId: userId ?? 65 };
    const settings = { projectId: '2325', userId: '0', threadId, };
    if (threadId && !initialMsg) {
      setLoading(true);
      aiService
        .getKaiChat(settings.projectId, settings.userId, threadId)
        .then((res) => {
          if (res && res.length) {
            setMessages(
              res.map((m) => {
                const isUser = m.role === 'human';
                return {
                  text: m.content,
                  isUser: isUser,
                };
              }),
            );
          }
        })
        .catch((e) => {
          console.error(e);
          toast.error("Couldn't load chat history. Please try again later.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
    if (threadId) {
      chatManager.current = new ChatManager(settings);
      chatManager.current.setOnMsgHook({
        msgCallback: (msg) => {
          if (msg.stage === 'chart') {
            setProcessing(msg);
          }
          if (msg.stage === 'final') {
            setMessages((prev) => [
              ...prev,
              {
                text: msg.content,
                isUser: false,
                userName: 'Kai',
              },
            ]);
            setProcessing(null);
          }
        },
        titleCallback: (title) => onTitleChange(title),
      });
    }
    return () => {
      chatManager.current?.disconnect();
      setInitialMsg(null);
    };
  }, [threadId]);

  React.useEffect(() => {
    if (initialMsg) {
      chatManager.current?.sendMesage(initialMsg);
    }
  }, [initialMsg]);

  const onSubmit = (text: string) => {
    chatManager.current?.sendMesage(text);
    setMessages((prev) => [
      ...prev,
      {
        text,
        isUser: true,
      },
    ]);
  };

  React.useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  const newChat = messages.length === 1 && processingStage === null;
  return (
    <Loader loading={isLoading} className={'w-full h-full'}>
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
            />
          ))}
          {processingStage ? (
            <ChatNotice content={processingStage.content} />
          ) : null}
          {newChat ? (
            <ChatNotice content={'Processing your question...'} />
          ) : null}
        </div>
        <div className={'sticky bottom-0 pt-6 w-2/3'}>
          <ChatInput onSubmit={onSubmit} />
        </div>
      </div>
    </Loader>
  );
}

export default ChatLog;
