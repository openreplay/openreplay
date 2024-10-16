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
          <Avatar size={16} src={<Icon name={'integrations/datadog'} size={14} />} />
          <Avatar size={16} src={<Icon name={'integrations/dynatrace'} size={14} />} />
          <Avatar size={16} src={<Icon name={'integrations/elasticsearch'} size={14} />} />
        </Avatar.Group>
      }
      onClick={onClick}
    />
  );
}

export default LogsButton;
