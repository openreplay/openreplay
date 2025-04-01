import React from 'react';
import { Icon } from 'UI';
import { MessagesSquare, ArrowLeft } from 'lucide-react';

function ChatHeader({
  openChats = () => {},
  goBack,
  chatTitle,
}: {
  goBack?: () => void;
  openChats?: () => void;
  chatTitle: string | null;
}) {
  return (
    <div
      className={
        'px-4 py-2 flex items-center bg-white border-b border-b-gray-lighter'
      }
    >
      <div className={'flex-1'}>
        {goBack ? (
          <div
            className={'flex items-center gap-2 font-semibold cursor-pointer'}
            onClick={goBack}
          >
            <ArrowLeft size={14} />
            <div>Back</div>
          </div>
        ) : null}
      </div>
      <div className={'flex items-center gap-2 mx-auto max-w-[80%]'}>
        {chatTitle ? (
          <div className="font-semibold text-xl whitespace-nowrap truncate">{chatTitle}</div>
        ) : (
          <>
            <Icon name={'kai_colored'} size={18} />
            <div className={'font-semibold text-xl'}>Kai</div>
          </>
        )}
      </div>
      <div
        className={
          'font-semibold cursor-pointer flex items-center gap-2 flex-1 justify-end'
        }
        onClick={openChats}
      >
        <MessagesSquare size={14} />
        <div>Chats</div>
      </div>
    </div>
  );
}

export default ChatHeader;
