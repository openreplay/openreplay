import React from 'react';
import { splitByDate } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { MessagesSquare, Trash, X } from 'lucide-react';
import { kaiService } from 'App/services';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';

function ChatsModal({
  onSelect,
  projectId,
  onHide,
}: {
  onSelect: (threadId: string, title: string) => void;
  projectId: string;
  onHide: () => void;
}) {
  const { t } = useTranslation();
  const { usage } = kaiStore;
  const {
    data = [],
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['kai', 'chats', projectId],
    queryFn: () => kaiService.getKaiChats(projectId),
    staleTime: 1000 * 60,
  });

  React.useEffect(() => {
    kaiStore.checkUsage();
  }, []);

  const datedCollections = React.useMemo(() => {
    return data.length ? splitByDate(data) : [];
  }, [data.length]);

  const onDelete = async (id: string) => {
    try {
      await kaiService.deleteKaiChat(projectId, id);
    } catch (e) {
      toast.error("Something wen't wrong. Please try again later.");
    }
    refetch();
  };
  return (
    <div
      className={'flex flex-col gap-2 p-4 mr-1 rounded-lg bg-white'}
      style={{ height: 'calc(-100px + 100svh)', marginTop: 60, width: 310 }}
    >
      <div className={'flex items-center font-semibold text-lg gap-2'}>
        <MessagesSquare size={16} />
        <span>{t('Previous Chats')}</span>
        <div className="ml-auto" />
        <div>
          <X
            size={16}
            strokeWidth={2}
            className="cursor-pointer hover:text-main"
            onClick={onHide}
          />
        </div>
      </div>
      {usage.percent > 80 ? (
        <div className="text-red text-sm">
          {t('You have used {{used}} out of {{total}} daily requests', {
            used: usage.used,
            total: usage.total,
          })}
        </div>
      ) : null}
      {isPending ? (
        <div className="animate-pulse text-disabled-text">
          {t('Loading chats')}...
        </div>
      ) : (
        <div className="overflow-y-auto flex flex-col gap-2">
          {datedCollections.map((col, i) => (
            <React.Fragment key={`${i}_${col.date}`}>
              <ChatCollection
                data={col.entries}
                date={col.date}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatCollection({
  data,
  onSelect,
  onDelete,
  date,
}: {
  data: { title: string; thread_id: string }[];
  onSelect: (threadId: string, title: string) => void;
  onDelete: (threadId: string) => void;
  date: string;
}) {
  return (
    <div className="border-b border-b-gray-lighter py-2">
      <div className="font-semibold">{date}</div>
      <ChatsList data={data} onSelect={onSelect} onDelete={onDelete} />
    </div>
  );
}

function ChatsList({
  data,
  onSelect,
  onDelete,
}: {
  data: { title: string; thread_id: string }[];
  onSelect: (threadId: string, title: string) => void;
  onDelete: (threadId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 -mx-4 px-4">
      {data.map((chat) => (
        <div
          key={chat.thread_id}
          className="flex items-center relative group min-h-7"
        >
          <div
            style={{ width: 270 - 28 - 4 }}
            className="rounded-l pl-2 min-h-7 h-full w-full hover:bg-active-blue flex items-center"
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
            className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-r min-h-7 h-full px-2 flex items-center group-hover:bg-active-blue"
          >
            <Trash size={14} className="text-disabled-text" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default observer(ChatsModal);
