import React, { useState } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import JumpButton from 'Shared/DevTools/JumpButton';

interface Props {
  log: any;
  iconProps: any;
  jump?: any;
  renderWithNL?: any;
  style?: any;
  onClick?: () => void;
}
function ConsoleRow(props: Props) {
  const { log, iconProps, jump, renderWithNL, style } = props;
  const [expanded, setExpanded] = useState(false);
  const lines = log.value?.split('\n').filter((l: any) => !!l) || [];
  const canExpand = lines.length > 1;
  const clickable = canExpand || !!log.errorId;

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const renderLine = (l: string) => {
    const parts = l.split(urlRegex);
    const formattedLine = parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a key={`link-${index}`}  className={'link text-main'} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        );
      }
      return part;
    });

    return formattedLine
  }

  const titleLine = lines[0];
  const restLines = lines.slice(1);
  return (
    <div
      style={style}
      className={cn(
        'border-b flex items-start py-1 px-4 pe-8 overflow-hidden group relative select-none',
        {
          info: !log.isYellow && !log.isRed,
          warn: log.isYellow,
          error: log.isRed,
          'cursor-pointer': clickable,
        }
      )}
      onClick={clickable ? () => (!!log.errorId ? props.onClick?.() : toggleExpand()) : undefined}
    >
      <div className="mr-2">
        <Icon size="14" {...iconProps} />
      </div>
      <div key={log.key} data-scroll-item={log.isRed}>
        <div className="flex items-start text-sm ">
          <div className={cn('flex items-start', { 'cursor-pointer underline decoration-dotted decoration-gray-400': !!log.errorId })}>
            {canExpand && (
              <Icon name={expanded ? 'caret-down-fill' : 'caret-right-fill'} className="mr-2" />
            )}
            <span className='font-mono '>
                {renderWithNL(titleLine)}
            </span>
          </div>
          {log.errorId && 
              <div className="ml-2 overflow-hidden text-ellipsis text-wrap font-mono">
                    <span className='w-full'>{log.message}</span>
              </div>}
        </div>
        {canExpand &&
          expanded &&
          restLines.map((l: string, i: number) => (
            <div key={l.slice(0, 4) + i} className="ml-4 mb-1" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>
              {renderLine(l)}
            </div>
          ))}
      </div>
      <JumpButton time={log.time} onClick={() => jump(log.time)} />
    </div>
  );
}

export default ConsoleRow;
