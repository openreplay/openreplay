import React from 'react';
import { Icon, CopyButton } from 'UI';
import cn from 'classnames';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader,
  ThumbsUp,
  ThumbsDown,
  ListRestart,
  FileDown,
  Clock,
} from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { kaiStore } from '../KaiStore';
import { toast } from 'react-toastify';
import { durationFormatted } from 'App/date';

export function ChatMsg({
  text,
  isUser,
  userName,
  messageId,
  isLast,
  duration,
  feedback,
  siteId,
}: {
  text: string;
  isUser: boolean;
  messageId: string;
  userName?: string;
  isLast?: boolean;
  duration?: number;
  feedback: boolean | null;
  siteId: string;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const onRetry = () => {
    kaiStore.editMessage(text);
  };
  const onFeedback = (feedback: 'like' | 'dislike', messageId: string) => {
    kaiStore.sendMsgFeedback(feedback, messageId, siteId);
  };

  const onExport = () => {
    setIsProcessing(true);
    if (!bodyRef.current) {
      toast.error('Failed to export message');
      setIsProcessing(false);
      return;
    }
    import('jspdf')
      .then(({ jsPDF }) => {
        const doc = new jsPDF();
        doc.addImage('/assets/img/logo-img.png', 80, 3, 30, 5);
        doc.html(bodyRef.current!, {
          callback: function (doc) {
            doc.save('document.pdf');
          },
          margin: [10, 10, 10, 10],
          x: 0,
          y: 0,
          width: 190, // Target width
          windowWidth: 675, // Window width for rendering
        });
      })
      .catch((e) => {
        console.error('Error exporting message:', e);
        toast.error('Failed to export message');
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };
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
      <div className={'mt-1 flex flex-col'}>
        <div className="markdown-body" ref={bodyRef}>
          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
        {isUser ? (
          isLast ? (
            <div
              onClick={onRetry}
              className={
                'ml-auto flex items-center gap-2 px-2 rounded-lg border border-gray-medium text-sm cursor-pointer hover:border-main hover:text-main w-fit'
              }
            >
              <ListRestart size={16} />
              <div>Edit</div>
            </div>
          ) : null
        ) : (
          <div className={'flex items-center gap-2'}>
            {duration ? <MsgDuration duration={duration} /> : null}
            <div className="ml-auto" />
            <IconButton
              active={feedback === true}
              tooltip="Like this answer"
              onClick={() => onFeedback('like', messageId)}
            >
              <ThumbsUp size={16} />
            </IconButton>
            <IconButton
              active={feedback === false}
              tooltip="Dislike this answer"
              onClick={() => onFeedback('dislike', messageId)}
            >
              <ThumbsDown size={16} />
            </IconButton>
            <CopyButton
              getHtml={() => bodyRef.current?.innerHTML}
              content={text}
              isIcon
              format={'text/html'}
            />
            <IconButton
              processing={isProcessing}
              tooltip="Export as PDF"
              onClick={onExport}
            >
              <FileDown size={16} />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  tooltip,
  processing,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
  processing?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip title={tooltip}>
      <Button
        onClick={onClick}
        type={active ? 'primary' : 'text'}
        icon={children}
        size="small"
        loading={processing}
      />
    </Tooltip>
  );
}

export function ChatNotice({
  content,
  duration,
}: {
  content: string;
  duration?: number;
}) {
  const startTime = React.useRef(duration ? Date.now() - duration : Date.now());
  const [activeDuration, setDuration] = React.useState(duration ?? 0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.round(Date.now() - startTime.current));
    }, 250);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col gap-1 items-start p-2 rounded-lg bg-gray-lightest border-gray-light w-fit ">
      <div className="flex gap-2 items-start">
        <div className={'animate-spin mt-1'}>
          <Loader size={14} />
        </div>
        <div className={'animate-pulse'}>{content}</div>
      </div>
      <MsgDuration duration={activeDuration} />
    </div>
  );
}

function MsgDuration({ duration }: { duration: number }) {
  return (
    <div className="text-disabled-text text-sm flex items-center gap-1">
      <Clock size={14} />
      <span className="leading-none">{durationFormatted(duration)}</span>
    </div>
  );
}
