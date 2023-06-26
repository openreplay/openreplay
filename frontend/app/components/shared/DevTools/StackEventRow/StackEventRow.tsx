import React from 'react';
import JumpButton from '../JumpButton';
import { Icon } from 'UI';
import cn from 'classnames';
import { OPENREPLAY } from 'Types/session/stackEvent';

interface Props {
  event: any;
  onJump: any;
  style?: any;
  isActive?: boolean;
  onClick?: any;
}

function StackEventRow(props: Props) {
  const { event, onJump, style, isActive } = props;
  let message: any = Array.isArray(event.payload) ? event.payload[0] : event.payload;
  message = typeof message === 'string' ? message : JSON.stringify(message);

  const iconProps: any = React.useMemo(() => {
    const { source } = event;
    return {
      name: `integrations/${source}`,
      size: 18,
      marginRight: source === OPENREPLAY ? 11 : 10
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
        { 'bg-teal-light': isActive, 'error color-red': event.isRed }
      )}
    >
      <div className={cn('mr-auto flex items-start')}>
        <Icon {...iconProps} />
        <div>
          <div className='capitalize font-medium mb-1'>{event.name}</div>
          <div className='code-font text-xs'>{message}</div>
        </div>
      </div>
      <JumpButton onClick={onJump} />
    </div>
  );
}

export default StackEventRow;
