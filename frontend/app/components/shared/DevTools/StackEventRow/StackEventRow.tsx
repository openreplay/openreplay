import { Icon } from '@/ui/icons/Icon';
import cn from 'classnames';
import React from 'react';

import JumpButton from '../JumpButton';
import { TabTag } from '../NetworkPanel/NetworkPanelComp';

interface Props {
  event: any;
  onJump: any;
  style?: any;
  isActive?: boolean;
  onClick?: any;
}

function StackEventRow(props: Props) {
  const { event, onJump, style, isActive } = props;
  let message: any = Array.isArray(event.payload)
    ? event.payload[0]
    : event.payload;
  message = typeof message === 'string' ? message : JSON.stringify(message);

  return (
    <div
      style={style}
      data-scroll-item={event.isRed}
      onClick={props.onClick}
      className={cn('m-dt__row m-dt__stack has-tail group', {
        'is-now': isActive,
        'is-error': event.isRed,
      })}
    >
      {event.tabNum ? (
        <TabTag tabName={event.tabName} tabNum={event.tabNum} />
      ) : null}
      <Icon name={`integrations/${event.source}` as any} size={14} />
      <span className="m-dt__stack-body">
        <span className="m-dt__stack-name">{event.name}</span>
        {message ? (
          <span className="m-dt__stack-msg m-mono m-truncate">{message}</span>
        ) : null}
      </span>
      <JumpButton time={event.time} onClick={onJump} />
    </div>
  );
}

export default StackEventRow;
