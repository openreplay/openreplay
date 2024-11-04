import React from 'react';
import { Icon, Tooltip } from 'UI';

interface Props {
  text: string;
  className?: string;
  position?: string;
}
export default function HelpText(props: Props) {
  const { text, className = '', position = 'top center' } = props;
  return (
    <div>
      <Tooltip title={text}>
        <div className={className}>
          <Icon name="question-circle" size={16} />
        </div>
      </Tooltip>
    </div>
  );
}
