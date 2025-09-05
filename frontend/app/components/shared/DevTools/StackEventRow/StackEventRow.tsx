import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
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

  const iconProps: any = React.useMemo(() => {
    const { source } = event;
    return {
      name: `integrations/${source}`,
      size: 18,
      className: "mx-3",
    };
  }, [event]);

  return (
    <div
      style={style}
      data-scroll-item={event.isRed}
      onClick={props.onClick}
      className={cn(
        'group flex items-center py-2 px-4 border-b cursor-pointer relative',
        'hover:bg-active-blue',
        { 'bg-teal-light': isActive, 'error color-red': event.isRed },
      )}
    >
      <div className={cn('mr-auto flex items-start')}>
        <TabTag tabName={event.tabName} tabNum={event.tabNum} />
        <Icon {...iconProps} />
        <div>
          <div className="capitalize font-medium mb-1 leading-none">{event.name}</div>
          <div className="code-font text-xs">{message}</div>
        </div>
      </div>
      <JumpButton time={event.time} onClick={onJump} />
    </div>
  );
}

export default StackEventRow;
