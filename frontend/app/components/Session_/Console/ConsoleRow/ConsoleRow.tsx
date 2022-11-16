import React, { useState } from 'react';
import cn from 'classnames';
import stl from '../console.module.css';
import { Icon } from 'UI';
import JumpButton from 'Shared/DevTools/JumpButton';

interface Props {
  log: any;
  iconProps: any;
  jump?: any;
  renderWithNL?: any;
}
function ConsoleRow(props: Props) {
  const { log, iconProps, jump, renderWithNL } = props;
  const [expanded, setExpanded] = useState(false);
  const lines = log.value.split('\n').filter((l: any) => !!l);
  const canExpand = lines.length > 1;
  return (
    <div
      className={cn(stl.line, 'flex py-2 px-4 overflow-hidden group relative select-none', {
        info: !log.isYellow() && !log.isRed(),
        warn: log.isYellow(),
        error: log.isRed(),
        'cursor-pointer': canExpand,
      })}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={cn(stl.timestamp)}>
        <Icon size="14" className={stl.icon} {...iconProps} />
      </div>
      {/* <div className={cn(stl.timestamp, {})}>
        {Duration.fromMillis(log.time).toFormat('mm:ss.SSS')}
      </div> */}
      <div key={log.key} className={cn('')} data-scroll-item={log.isRed()}>
        <div className={cn(stl.message, 'flex items-center')}>
          {canExpand && (
            <Icon name={expanded ? 'caret-down-fill' : 'caret-right-fill'} className="mr-2" />
          )}
          <span>{renderWithNL(lines.pop())}</span>
        </div>
        {canExpand && expanded && lines.map((l: any) => <div className="ml-4 mb-1">{l}</div>)}
      </div>
      <JumpButton onClick={() => jump(log.time)} />
    </div>
  );
}

export default ConsoleRow;
