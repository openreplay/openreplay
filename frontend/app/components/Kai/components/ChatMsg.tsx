import React from 'react';
import { CopyButton, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader,
  ThumbsUp,
  ThumbsDown,
  SquarePen,
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
import jsPDF from 'jspdf';
import html2canvas from '@codewonders/html2canvas';
import { replaceEmojisWithImages, waitForImages } from './pdfUtils'

function ChatMsg({
  siteId,
  canEdit,
  message,
  chatTitle,
  onReplay,
}: {
  message: Message;
  canEdit?: boolean;
  siteId: string;
  chatTitle: string | null;
  onReplay: (session: any) => void;
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

  const onExport = async () => {
    setIsProcessing(true);
    if (!bodyRef.current) {
      toast.error('Failed to export message');
      setIsProcessing(false);
      return;
    }
    const userPrompt = kaiStore.getPreviousMessage(message.messageId);
    try {
      const doc = new jsPDF();
      const blockWidth = 170; // mm
      const content = bodyRef.current!.cloneNode(true) as HTMLElement;
      if (userPrompt) {
        const titleHeader = document.createElement('h2');
        titleHeader.textContent = userPrompt.text;
        titleHeader.style.marginBottom = '10px';
        content.prepend(titleHeader);
      }
      const offscreen = document.createElement('div');
      offscreen.style.position = 'fixed';
      offscreen.style.left = '-100000px';
      offscreen.style.top = '0';
      offscreen.style.background = 'white';
      offscreen.style.width = '900px';

      const logo = new Image();
      logo.src = '/assets/img/logo-img.png';
      logo.style.width = '130px';
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.marginBottom = '10mm';
      container.style.width = `${blockWidth}mm`;
      content.style.background = 'white';
      content.style.color = 'black';
      container.appendChild(logo);
      content.prepend(container);
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

      offscreen.appendChild(content);
      document.body.appendChild(offscreen);

      replaceEmojisWithImages(content);

      await waitForImages(content);

      doc.html(content, {
        callback: function (doc) {
          doc.save((chatTitle ?? 'document') + '.pdf');
        },
        // top, bottom, right, left
        margin: [10, 10, 20, 20],
        x: 0,
        y: 0,
        // Target width
        width: blockWidth,
        // Window (or vpoint) width for rendering
        windowWidth: 675,
      });
      offscreen.remove();
    } catch (e) {
      console.error('Error exporting message:', e);
      toast.error('Failed to export message');
    } finally {
      setIsProcessing(false);
    }
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
    if (!chart_data && metricData) {
      const hasValues =
        metricData.values?.length > 0 || metricData.chart?.length > 0;
      if (hasValues) {
        kaiStore.saveLatestChart(messageId, siteId);
      }
    }
  }, [metricData, chart_data]);
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={'mt-1 flex flex-col group/actions max-w-[60svw]'}>
        <div
          className={cn(
            'markdown-body',
            isUser ? 'bg-gray-lighter px-4 rounded-full' : '',
            isEditing ? 'bg-active-blue!' : '',
          )}
          data-openreplay-obscured
          ref={bodyRef}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
        {metric ? (
          <div
            ref={chartRef}
            className="p-2 border-gray-light rounded-lg shadow-sm bg-glassWhite mb-2"
          >
            <WidgetChart metric={metric} isPreview height={360} />
          </div>
        ) : null}
        {message.sessions ? (
          <div className="flex flex-col">
            {message.sessions.map((session) => (
              <div className="shadow-sm border rounded-2xl overflow-hidden mb-2">
                <SessionItem
                  disableUser
                  key={session.sessionId}
                  session={session}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReplay(session);
                  }}
                  slim
                />
              </div>
            ))}
          </div>
        ) : null}
        {isUser ? (
          <div className="invisible group-hover/actions:visible mt-1 ml-auto flex gap-2 items-center">
            {canEdit && !isEditing ? (
              <IconButton onClick={onEdit} tooltip={t('Edit')}>
                <SquarePen size={16} />
              </IconButton>
            ) : null}
            {isEditing ? (
              <Button
                onClick={onCancelEdit}
                type="text"
                size="small"
                className={'text-xs'}
              >
                {t('Cancel')}
              </Button>
            ) : null}
            <CopyButton
              getHtml={() => bodyRef.current?.innerHTML}
              content={text}
              isIcon
              format={'text/html'}
            />
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
              <ThumbsUp strokeWidth={2} size={16} />
            </IconButton>
            <IconButton
              active={feedback === false}
              tooltip="Dislike this answer"
              onClick={() => onFeedback('dislike', messageId)}
            >
              <ThumbsDown strokeWidth={2} size={16} />
            </IconButton>
            {supports_visualization ? (
              <IconButton
                tooltip="Visualize this answer"
                onClick={getChart}
                processing={loadingChart}
              >
                <ChartLine strokeWidth={2} size={16} />
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
              <Icon name="export-pdf" size={16} color="black" />
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
