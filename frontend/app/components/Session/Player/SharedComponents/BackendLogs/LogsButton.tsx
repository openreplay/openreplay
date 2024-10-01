import { Avatar } from 'antd';
import React from 'react';

import ControlButton from 'App/components/Session_/Player/Controls/ControlButton';
import { Icon } from 'UI';

function LogsButton({
  integrated,
  onClick,
}: {
  integrated: string[];
  onClick: () => void;
}) {
  return (
    <ControlButton
      label={'Traces'}
      customTags={
        <Avatar.Group>
          <Avatar size={'small'}>
            <Icon name={'integrations/datadog'} size={12} />
          </Avatar>
        </Avatar.Group>
      }
      onClick={onClick}
    />
  );
}

export default LogsButton;
