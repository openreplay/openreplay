import React from 'react';
import JumpButton from '../JumpButton';
import { Icon } from 'UI';
import cn from 'classnames';
import { OPENREPLAY, SENTRY, DATADOG, STACKDRIVER } from 'Types/session/stackEvent';
import { useModal } from 'App/components/Modal';
import StackEventModal from '../StackEventModal';

interface Props {
  event: any;
  onJump: any;
}
function StackEventRow(props: Props) {
  const { event, onJump } = props;
  let message = event.payload[0] || '';
  message = typeof message === 'string' ? message : JSON.stringify(message);
  const onClickDetails = () => {
    showModal(<StackEventModal event={event} />, { right: true });
  };
  const { showModal } = useModal();

  const iconProps: any = React.useMemo(() => {
    const { source } = event;
    return {
      name: `integrations/${source}`,
      size: 18,
      marginRight: source === OPENREPLAY ? 11 : 10,
    };
  }, [event]);

  return (
    <div
      data-scroll-item={event.isRed()}
      onClick={onClickDetails}
      className={cn(
        'group flex items-center py-2 px-4 border-b cursor-pointer relative',
        'hover:bg-active-blue'
      )}
    >
      <div className={cn('mr-auto flex items-start')}>
        <Icon {...iconProps} />
        <div>
          <div className="capitalize font-medium mb-1">{event.name}</div>
          <div className="code-font text-xs">{message}</div>
        </div>
      </div>
      <JumpButton onClick={onJump} />
    </div>
  );
}

export default StackEventRow;
