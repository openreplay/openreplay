import { Avatar } from 'antd';
import React from 'react';

import ControlButton from 'App/components/Session_/Player/Controls/ControlButton';
import { Icon } from 'UI';

function LogsButton({
  integrated,
  onClick,
  shorten,
}: {
  integrated: string[];
  onClick: () => void;
  shorten?: boolean;
}) {
  return (
    <ControlButton
      label={shorten ? null : "Traces"}
      customKey="traces"
      customTags={
        <Avatar.Group>
          {integrated.map((name) => (
            <Avatar
              key={name}
              size={16}
              src={<Icon name={`integrations/${name}`} size={14} />}
            />
          ))}
        </Avatar.Group>
      }
      onClick={onClick}
    />
  );
}

export default LogsButton;
