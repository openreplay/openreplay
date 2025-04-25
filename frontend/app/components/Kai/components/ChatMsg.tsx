import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import Markdown from 'react-markdown';
import { Loader, ThumbsUp, ThumbsDown, ListRestart } from 'lucide-react';
import { toast } from 'react-toastify';
import { aiService } from 'App/services';

export function ChatMsg({
  text,
  isUser,
  userName,
  messageId,
}: {
  text: string;
  isUser: boolean;
  messageId: string;
  userName?: string;
}) {
  const onClick = () => {
    toast.info('I do nothing!');
  };
  const onFeedback = (feedback: 'like' | 'dislike', messageId: string) => {
    const settings = { projectId: '2325', userId: '0' };
    aiService
      .feedback(feedback === 'like', messageId, settings.projectId, settings.userId)
      .then(() => {
        toast.success('Feedback saved.');
      })
      .catch((e) => {
        console.error(e);
        toast.error('Failed to send feedback. Please try again later.');
      });
  }
  return (
    <div
      className={cn(
        'flex items-start gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {isUser ? (
        <div
          className={
            'rounded-full bg-main text-white min-w-8 min-h-8 flex items-center justify-center sticky top-0'
          }
        >
          <span className={'font-semibold'}>{userName}</span>
        </div>
      ) : (
        <div
          className={
            'rounded-full bg-white shadow min-w-8 min-h-8 flex items-center justify-center sticky top-0'
          }
        >
          <Icon name={'kai_colored'} size={18} />
        </div>
      )}
      <div className={'mt-1'}>
        <Markdown>{text}</Markdown>
        {isUser ? null : (
          <div className={'flex items-center gap-2'}>
            <IconButton onClick={() => onFeedback('like', messageId)}>
              <ThumbsUp size={16} />
            </IconButton>
            <IconButton onClick={() => onFeedback('dislike', messageId)}>
              <ThumbsDown size={16} />
            </IconButton>

            <div
              onClick={onClick}
              className={
                'flex items-center gap-2 px-2 rounded-lg border border-gray-medium text-sm cursor-pointer hover:border-main hover:text-main'
              }
            >
              <ListRestart size={16} />
              <div>Retry</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={'cursor-pointer hover:text-main'} onClick={onClick}>
      {children}
    </div>
  );
}

export function ChatNotice({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-lightest border-gray-light w-fit">
      <div className={'animate-spin'}>
        <Loader size={14} />
      </div>
      <div className={'animate-pulse text-disabled-text'}>{content}</div>
    </div>
  );
}
