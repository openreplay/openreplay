import React from 'react';
import { Icon } from 'UI';
import { MessagesSquare, ArrowLeft, SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ChatHeader({
  openChats = () => {},
  goBack,
  chatTitle,
}: {
  goBack?: () => void;
  openChats?: () => void;
  chatTitle: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <div
        className={'px-4 py-2 flex items-center bg-gray-lightest rounded-lg'}
      >
        <div className={'flex-1'}>
          {goBack ? (
            <div
              className={
                'w-fit flex items-center gap-2 font-semibold cursor-pointer'
              }
              onClick={goBack}
            >
              <ArrowLeft size={14} />
              <div>{t('Back')}</div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Icon name={'kai_colored'} size={18} />
              <div className={'font-semibold text-xl'}>Kai</div>
            </div>
          )}
        </div>
        <div className={'flex items-center gap-2 mx-auto max-w-[80%]'}>
          {chatTitle ? (
            <div className="font-semibold text-xl whitespace-nowrap truncate">
              {chatTitle}
            </div>
          ) : null}
        </div>
        <div className={'flex-1 justify-end flex items-center gap-2'}>
          {goBack ? (
            <div className="font-semibold w-fit cursor-pointer flex items-center gap-2">
              <SquarePen size={14} />
              <div>{t('New Chat')}</div>
            </div>
          ) : null}
          <div
            className="font-semibold w-fit cursor-pointer flex items-center gap-2"
            onClick={openChats}
          >
            <MessagesSquare size={14} />
            <div>{t('Chats')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatHeader;
