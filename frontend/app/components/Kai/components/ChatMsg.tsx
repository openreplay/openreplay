import React from 'react';
import { Icon, CopyButton } from 'UI';
import cn from 'classnames';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import { Loader, ThumbsUp, ThumbsDown, ListRestart, FileDown } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { kaiStore } from '../KaiStore';
import { toast } from 'react-toastify';

export function ChatMsg({
  text,
  isUser,
  userName,
  messageId,
  isLast,
}: {
  text: string;
  isUser: boolean;
  messageId: string;
  userName?: string;
  isLast?: boolean;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const onRetry = () => {
    kaiStore.editMessage(text)
  }
  const onFeedback = (feedback: 'like' | 'dislike', messageId: string) => {
    kaiStore.sendMsgFeedback(feedback, messageId);
  };

  const onExport = () => {
    setIsProcessing(true);
    import('jsPDF').then(({ jsPDF }) => {
      const doc = new jsPDF();

      doc.html(bodyRef.current, {
        callback: function(doc) {
          doc.save('document.pdf');
        },
        margin: [10, 10, 10, 10],
        x: 0,
        y: 0,
        width: 190, // Target width
        windowWidth: 675 // Window width for rendering
      });
    })
    .catch(e => {
      console.error('Error exporting message:', e);
      toast.error('Failed to export message');
    })
    .finally(() => {
      setIsProcessing(false);
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
        <div className='markdown-body' ref={bodyRef}>
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
            <IconButton tooltip="Like this answer" onClick={() => onFeedback('like', messageId)}>
              <ThumbsUp size={16} />
            </IconButton>
            <IconButton tooltip="Dislike this answer" onClick={() => onFeedback('dislike', messageId)}>
              <ThumbsDown size={16} />
            </IconButton>
            <CopyButton content={() => bodyRef.current?.innerHTML} isIcon format={'text/html'} />
            <IconButton processing={isProcessing} tooltip="Export as PDF" onClick={onExport}>
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
  processing?: boolean;
}) {
  return (
    <Tooltip title={tooltip}>
      <Button onClick={onClick} type="text" icon={children} size='small' loading={processing} />
    </Tooltip>
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
