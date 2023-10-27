import React, { useState } from 'react';
import cn from 'classnames';
import { Icon, TextEllipsis } from 'UI';
import JumpButton from 'Shared/DevTools/JumpButton';

interface Props {
  log: any;
  iconProps: any;
  jump?: any;
  renderWithNL?: any;
  style?: any;
  recalcHeight?: () => void;
  onClick: () => void;
}
function ConsoleRow(props: Props) {
  const { log, iconProps, jump, renderWithNL, style, recalcHeight } = props;
  const [expanded, setExpanded] = useState(false);
  const lines = log.value?.split('\n').filter((l: any) => !!l) || [];
  const canExpand = lines.length > 1;
  const clickable = canExpand || !!log.errorId;

  React.useEffect(() => {
    recalcHeight?.();
  }, [expanded])
  React.useEffect(() => {
    recalcHeight?.();
  }, [])

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div
      style={style}
      className={cn(
        'border-b flex items-center py-2 px-4 overflow-hidden group relative select-none',
        {
          info: !log.isYellow && !log.isRed,
          warn: log.isYellow,
          error: log.isRed,
          'cursor-pointer': clickable,
        }
      )}
      onClick={clickable ? () => (!!log.errorId ? props.onClick() : toggleExpand()) : undefined}
    >
      <div className="mr-2">
        <Icon size="14" {...iconProps} />
      </div>
      <div key={log.key} data-scroll-item={log.isRed}>
        <div className="flex items-center">
          <div className={cn('flex items-center', { 'cursor-pointer underline decoration-dotted decoration-gray-400': !!log.errorId })}>
            {canExpand && (
              <Icon name={expanded ? 'caret-down-fill' : 'caret-right-fill'} className="mr-2" />
            )}
            <span style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>{renderWithNL(lines.pop())}</span>
          </div>
          {log.errorId && <TextEllipsis className="ml-2 overflow-hidden" text={log.message}></TextEllipsis>}
        </div>
        {canExpand &&
          expanded &&
          lines.map((l: string, i: number) => (
            <div key={l.slice(0, 4) + i} className="ml-4 mb-1" style={{ fontFamily: 'Menlo, Monaco, Consolas' }}>
              {l}
            </div>
          ))}
      </div>
      <JumpButton onClick={() => jump(log.time)} />
    </div>
  );
}

export default ConsoleRow;
