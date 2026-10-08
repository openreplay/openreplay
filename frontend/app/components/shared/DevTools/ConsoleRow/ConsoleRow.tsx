import cn from 'classnames';
import { ChevronRight, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ExplainButton from 'Shared/DevTools/ExplainButton';
import JumpButton, { RowCopy } from 'Shared/DevTools/JumpButton/JumpButton';

import TabTag from '../TabTag';

interface Props {
  log: any;
  iconProps?: any;
  jump?: any;
  renderWithNL?: any;
  style?: any;
  onClick?: () => void;
  getTabNum?: (tab: string) => number;
  showSingleTab: boolean;
  sessionId: string;
}

const urlRegex = /(https?:\/\/[^\s)]+)/g;

function renderLine(l: string) {
  return l.split(urlRegex).map((part, index) =>
    urlRegex.test(part) ? (
      <a
        key={`link-${index}`}
        className="m-dt__loglink"
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

const levelOf = (log: any) =>
  log.isRed ? 'error' : log.isYellow ? 'warn' : 'info';
const LEVEL_ICON = { error: CircleAlert, warn: TriangleAlert, info: Info };

function ConsoleRow(props: Props) {
  const { t } = useTranslation();
  const { log, jump, style } = props;
  const [expanded, setExpanded] = useState(false);
  const lines: string[] =
    log.value?.split('\n').filter((l: string) => !!l) || [];
  const canExpand = lines.length > 1;
  const clickable = canExpand || !!log.errorId;
  const level = levelOf(log);
  const Icon = LEVEL_ICON[level];

  const logSource = props.showSingleTab ? -1 : props.getTabNum?.(log.tabId);
  const message = log.message ? `${log.value} ${log.message}` : log.value;

  return (
    <div
      style={style}
      className={cn('m-dt__row m-dt__log has-tail group', {
        'is-error': level === 'error',
        'is-warn': level === 'warn',
        'is-open': canExpand && expanded,
        'is-inert': !clickable,
      })}
      onClick={
        clickable
          ? () => (log.errorId ? props.onClick?.() : setExpanded(!expanded))
          : undefined
      }
      data-scroll-item={log.isRed}
    >
      {logSource != null && logSource !== -1 && (
        <TabTag logSource={logSource} logTabId={log.tabId} />
      )}
      {canExpand ? (
        <span
          className="m-dt__rowopen"
          aria-expanded={expanded}
          aria-label={expanded ? t('Collapse') : t('Expand')}
        >
          <ChevronRight size={11} />
        </span>
      ) : (
        <span className="m-dt__rowopen is-empty" aria-hidden="true" />
      )}
      <Icon
        size={12}
        className={`m-dt__level is-${level}`}
        aria-hidden="true"
      />
      <span className="m-dt__logtext m-mono">
        {renderLine(lines[0] ?? '')}
        {log.errorId && (
          <span className="m-dt__logmsg m-dt__logref"> {log.message}</span>
        )}
      </span>
      {canExpand && expanded && (
        <pre className="m-dt__logbody m-mono">
          {lines.slice(1).map((l, i) => (
            <div key={i}>{renderLine(l)}</div>
          ))}
        </pre>
      )}
      <JumpButton
        extra={
          <>
            <RowCopy text={message} />
            <ExplainButton
              sessionId={props.sessionId}
              log={{ level: log.level, message }}
            />
          </>
        }
        time={log.time}
        onClick={() => jump(log.time)}
      />
    </div>
  );
}

export default ConsoleRow;
