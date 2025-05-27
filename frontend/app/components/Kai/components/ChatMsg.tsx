import React from 'react';
import { CopyButton } from 'UI';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader,
  ThumbsUp,
  ThumbsDown,
  SquarePen,
  FileDown,
  Clock,
  ChartLine,
} from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { kaiStore, Message } from '../KaiStore';
import { toast } from 'react-toastify';
import { durationFormatted } from 'App/date';
import WidgetChart from '@/components/Dashboard/components/WidgetChart';
import Widget from 'App/mstore/types/widget';
import { useTranslation } from 'react-i18next';
import SessionItem from 'Shared/SessionItem';

function ChatMsg({
  userName,
  siteId,
  canEdit,
  message,
  chatTitle,
}: {
  message: Message;
  userName?: string;
  canEdit?: boolean;
  siteId: string;
  chatTitle: string | null;
}) {
  const { t } = useTranslation();
  const [metric, setMetric] = React.useState<Widget | null>(null);
  const [loadingChart, setLoadingChart] = React.useState(false);
  const {
    text,
    isUser,
    messageId,
    duration,
    feedback,
    supports_visualization,
    chart_data,
  } = message;
  const isEditing = kaiStore.replacing && messageId === kaiStore.replacing;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const onEdit = () => {
    kaiStore.editMessage(text, messageId);
  };
  const onCancelEdit = () => {
    kaiStore.setQueryText('');
    kaiStore.setReplacing(null);
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
    const userPrompt = kaiStore.getPreviousMessage(message.messageId);
    import('jspdf')
      .then(async ({ jsPDF }) => {
        const doc = new jsPDF();
        const blockWidth = 170; // mm
        doc.addImage('/assets/img/logo-img.png', 20, 15, 30, 5);
        const content = bodyRef.current!.cloneNode(true) as HTMLElement;
        if (userPrompt) {
          const titleHeader = document.createElement('h2');
          titleHeader.textContent = userPrompt.text;
          titleHeader.style.marginBottom = '10px';
          content.prepend(titleHeader);
        }
        content.querySelectorAll('ul').forEach((ul) => {
          const frag = document.createDocumentFragment();
          ul.querySelectorAll('li').forEach((li) => {
            const div = document.createElement('div');
            div.textContent = '• ' + li.textContent;
            frag.appendChild(div);
          });
          ul.replaceWith(frag);
        });
        content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => {
          (el as HTMLElement).style.letterSpacing = '0.5px';
        });
        content.querySelectorAll('*').forEach((node) => {
          node.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              const txt = child.textContent || '';
              const replaced = txt.replace(/-/g, '–');
              if (replaced !== txt) child.textContent = replaced;
            }
          });
        });
        if (metric && chartRef.current) {
          const { default: html2canvas } = await import('html2canvas');
          const metricContainer = chartRef.current;
          const image = await html2canvas(metricContainer, {
            backgroundColor: null,
            scale: 2,
          });
          const imgData = image.toDataURL('image/png');
          const imgHeight = (image.height * blockWidth) / image.width;
          content.appendChild(
            Object.assign(document.createElement('img'), {
              src: imgData,
              style: `width: ${blockWidth}mm; height: ${imgHeight}mm; margin-top: 10px;`,
            }),
          );
        }
        doc.html(content, {
          callback: function (doc) {
            doc.save((chatTitle ?? 'document') + '.pdf');
          },
          // top, bottom, ?, left
          margin: [5, 10, 20, 20],
          x: 0,
          y: 15,
          // Target width
          width: blockWidth,
          // Window width for rendering
          windowWidth: 675,
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

  React.useEffect(() => {
    if (chart_data) {
      const metric = kaiStore.getParsedChart(chart_data);
      setMetric(metric);
    }
  }, [chart_data]);

  const getChart = async () => {
    try {
      setLoadingChart(true);
      const metric = await kaiStore.getMessageChart(messageId, siteId);
      setMetric(metric);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingChart(false);
    }
  };

  const metricData = metric?.data;
  React.useEffect(() => {
    if (!chart_data && metricData && metricData.values.length > 0) {
      kaiStore.saveLatestChart(messageId, siteId);
    }
  }, [metricData, chart_data]);
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={'mt-1 flex flex-col group/actions'}>
        <div
          className={cn(
            'markdown-body',
            isUser ? 'bg-gray-lighter px-4 rounded-full' : '',
            isEditing ? '!bg-active-blue' : '',
          )}
          data-openreplay-obscured
          ref={bodyRef}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
        {metric ? (
          <div
            ref={chartRef}
            className="p-2 border-gray-light rounded-lg shadow bg-glassWhite mb-2"
          >
            <WidgetChart metric={metric} isPreview height={360} />
          </div>
        ) : null}
        {message.sessions ? (
          <div className="flex flex-col">
            {message.sessions.map((session) => (
              <div className="shadow border rounded-xl overflow-hidden mb-2">
                <SessionItem key={session.sessionId} session={session} slim />
              </div>
            ))}
          </div>
        ) : null}
        {isUser ? (
          <div className="invisible group-hover/actions:visible mt-2">
            <Tooltip title={t('Edit')}>
              <div
                onClick={onEdit}
                className={cn(
                  'ml-auto flex items-center gap-2 px-2',
                  'rounded-lg cursor-pointer',
                  'hover:text-main w-fit',
                  canEdit && !isEditing ? '' : 'hidden',
                )}
              >
                <SquarePen size={16} />
              </div>
            </Tooltip>
            <div
              onClick={onCancelEdit}
              className={cn(
                'ml-auto flex items-center gap-2 px-2',
                'rounded-lg border border-gray-medium text-xs cursor-pointer',
                'hover:border-main hover:text-main w-fit',
                isEditing ? '' : 'hidden',
              )}
            >
              <div>{t('Cancel')}</div>
            </div>
          </div>
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
            {supports_visualization ? (
              <IconButton
                tooltip="Visualize this answer"
                onClick={getChart}
                processing={loadingChart}
              >
                <ChartLine size={16} />
              </IconButton>
            ) : null}
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

export default observer(ChatMsg);
